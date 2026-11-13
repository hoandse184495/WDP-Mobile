import type { InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '@/core/network/api-client';
import { environment } from '@/core/config/environment';
import { horseApi } from '@/features/horses/api/horse-api';
import { taskApi } from '@/features/tasks/api/task-api';
import { workspaceApi } from '@/features/workspace/api/workspace-api';
import { sessionApi } from '@/features/training/api/session-api';
import { canManageTrainingPlan, allRoles } from '@/core/constants/roles';
import { findOperation, allowedOperation } from '@/features/operations/contracts/registry';
import { notificationDestination } from '@/features/notifications/utils/notification-destination';
import { auditChanges } from '@/features/audit/utils/audit-changes';
jest.mock('@/core/network/photo-upload', () => ({ pickAndUploadPhoto: jest.fn() }));
const id = 'a'.repeat(24),
  other = 'b'.repeat(24);
const originalAdapter = apiClient.defaults.adapter;
const ok = (config: InternalAxiosRequestConfig, data: unknown) => ({
  config,
  status: 200,
  statusText: 'OK',
  headers: {},
  data: { success: true, data },
});
// Adapter type is kept explicit below because axios also accepts adapter names.
beforeEach(() => {
  environment.apiUrl = 'http://10.0.2.2:3000/api';
});
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});
test('horse read preserves passport, chip and revision returned by backend', async () => {
  const horse = {
    _id: id,
    name: 'Thanh Phong',
    registrationCode: 'AP-206',
    breed: 'Thoroughbred',
    gender: 'stallion',
    dateOfBirth: '2021-03-15',
    fitnessScore: 80,
    healthStatus: 'ready',
    isTrainingLocked: false,
    identity: {
      microchipNumber: 'CHIP-206',
      passportNumber: 'PASS-206',
      registryName: 'An Phú',
      birthCountry: 'Việt Nam',
      markings: 'Vệt trắng',
    },
    identityRevision: 7,
  };
  apiClient.defaults.adapter = async (config) => ok(config, { horse });
  expect(await horseApi.detail(id)).toMatchObject({
    identity: horse.identity,
    identityRevision: 7,
  });
});
test.each(['normal', 'partial', 'refused', 'not_fed'] as const)(
  'task read preserves saved feeding outcome %s',
  async (feedingOutcome) => {
    const task = {
      _id: id,
      title: 'Bữa sáng',
      type: 'feeding',
      status: 'completed',
      revision: 1,
      scheduledStartAt: '2026-11-09T01:00:00Z',
      scheduledEndAt: '2026-11-09T02:00:00Z',
      instructions: '',
      feedingOutcome,
      acknowledgedRationChange: true,
      completionNotes: 'Đã theo dõi',
    };
    apiClient.defaults.adapter = async (config) => ok(config, { task });
    expect(await taskApi.detail(id)).toMatchObject({
      feedingOutcome,
      acknowledgedRationChange: true,
    });
  },
);
test('stall detail requests the selected day from the dedicated scoped endpoint', async () => {
  const controller = new AbortController();
  const details = {
    stall: { _id: id, code: 'A-01', occupied: true },
    occupancy: { horseId: { _id: other, name: 'Thanh Phong' } },
    groom: { _id: 'groom', fullName: 'Nguyễn An' },
    tasks: [],
    historyAllowed: false,
    history: [],
  };
  apiClient.defaults.adapter = async (config) => {
    expect(config.url).toBe('/stables/stalls/' + id + '/details');
    expect(config.params).toEqual({ date: '2026-11-10' });
    expect(config.signal).toBe(controller.signal);
    return ok(config, details);
  };
  expect(await workspaceApi.detail('stalls', id, controller.signal, 1, '2026-11-10')).toMatchObject(
    { _id: id, code: 'A-01', _details: details },
  );
});
test('opens an exact training session from a later page without inventing an unsupported detail endpoint', async () => {
  const calls: number[] = [];
  const controller = new AbortController();
  apiClient.defaults.adapter = async (config) => {
    expect(config.url).toBe('/training-sessions');
    expect(config.signal).toBe(controller.signal);
    expect(config.params.limit).toBe(100);
    const page = config.params.page;
    calls.push(page);
    return ok(config, {
      sessions: [
        {
          _id: page === 1 ? other : id,
          trainerNotes: page === 1 ? 'Other' : 'Ghi chú đang có',
          performanceRating: 4,
        },
      ],
      pagination: { page, limit: 100, total: 101, totalPages: 2 },
    });
  };
  expect(await workspaceApi.detail('sessions', id, controller.signal)).toMatchObject({
    _id: id,
    trainerNotes: 'Ghi chú đang có',
    performanceRating: 4,
  });
  expect(calls).toEqual([1, 2]);
});
test('session lookup returns not found when the scoped list cannot see it', async () => {
  apiClient.defaults.adapter = async (config) =>
    ok(config, { sessions: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
  await expect(sessionApi.get(id)).rejects.toMatchObject({ status: 404 });
});
test.each(allRoles)('%s has the same training-plan write roles as backend', (role) => {
  const expected = ['club_manager', 'head_trainer'].includes(role);
  expect(canManageTrainingPlan(role)).toBe(expected);
  expect(allowedOperation(findOperation('training.delete')!, role, { _id: id })).toBe(expected);
});
test.each([
  [
    '/dashboard/training?tab=sessions&session=' + id,
    { pathname: '/records/[module]/[id]', params: { module: 'sessions', id } },
  ],
  [
    '/dashboard/training?tab=sessions&review=' + id,
    { pathname: '/session-review/[id]', params: { id } },
  ],
  ['/dashboard/daily-tasks?task=' + id, { pathname: '/tasks/[id]', params: { id } }],
  [
    '/dashboard/admissions?application=' + id,
    { pathname: '/records/[module]/[id]', params: { module: 'admissions', id } },
  ],
  [
    '/dashboard/medical-care?schedule=' + id,
    { pathname: '/records/[module]/[id]', params: { module: 'schedules', id } },
  ],
  [
    '/dashboard/prescriptions?record=' + id,
    { pathname: '/records/[module]/[id]', params: { module: 'prescriptions', id } },
  ],
  [
    '/dashboard/incidents?report=' + id,
    { pathname: '/records/[module]/[id]', params: { module: 'incidents', id } },
  ],
  [
    '/dashboard/daily-tasks?batchNotification=' + id,
    { pathname: '/notification-tasks/[id]', params: { id } },
  ],
] as const)('notification opens the exact record: %s', (path, expected) =>
  expect(notificationDestination(path)).toEqual(expected),
);
test('unrecognized notification targets do not navigate blindly', () =>
  expect(notificationDestination('/unexpected')).toBeNull());
test('audit preserves meaningful zero, false, removed and changed values, but hides credentials', () => {
  const rows = auditChanges({
    before: {
      performanceRating: 0,
      alertTriggered: false,
      trainerNotes: 'Cũ',
      password: 'private1',
      nested: { token: 'a', name: 'same' },
    },
    after: {
      performanceRating: 4,
      alertTriggered: true,
      trainerNotes: null,
      password: 'private2',
      nested: { name: 'same', token: 'b' },
    },
  });
  expect(rows.map((row) => row.key)).toEqual([
    'performanceRating',
    'alertTriggered',
    'trainerNotes',
  ]);
  expect(rows[0]).toMatchObject({ before: '0', after: '4' });
  expect(rows[1]).toMatchObject({ before: 'Không', after: 'Có' });
  expect(rows[2]).toMatchObject({ before: 'Cũ', after: '—' });
  expect(JSON.stringify(rows)).not.toContain('private');
});
test('audit object key order alone is not a change', () =>
  expect(
    auditChanges({
      before: { identity: { passportNumber: 'P1', microchipNumber: 'C1' } },
      after: { identity: { microchipNumber: 'C1', passportNumber: 'P1' } },
    }),
  ).toEqual([]));
