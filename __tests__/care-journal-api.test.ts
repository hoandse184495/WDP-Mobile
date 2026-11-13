import { clubDate } from '@/core/utils/date';
import {
  clinicalRecordSchema,
  clinicalScheduleSchema,
} from '@/features/horses/types/health-dossier';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '@/core/network/api-client';
import { environment } from '@/core/config/environment';
import { queryClient } from '@/core/network/query-client';
import { careJournalApi } from '@/features/horses/api/care-journal-api';
import {
  journalTimeline,
  validJournalDay,
  journalPhotoUrl,
  illustrationPhoto,
} from '@/features/horses/utils/care-journal';
import { loadClinicalHolds } from '@/features/horses/components/clinical-hold-queue';
import { isClinicalHold } from '@/features/horses/utils/clinical-hold';
import { operationsApi } from '@/features/operations/api/operations-api';
import { findOperation } from '@/features/operations/contracts/registry';
import { operationInitial } from '@/features/operations/contracts/business-rules';
import { journalFixture, scopedHorse, horseId, otherHorseId } from './fixtures/care-journal';
const original = apiClient.defaults.adapter;
const ok = (config: InternalAxiosRequestConfig, data: unknown) => ({
  config,
  status: 200,
  statusText: 'OK',
  headers: {},
  data: { success: true, data },
});
const reject = (config: InternalAxiosRequestConfig, status: number): never => {
  throw new AxiosError('denied', 'ERR_BAD_RESPONSE', config, undefined, {
    config,
    status,
    statusText: 'denied',
    headers: {},
    data: { success: false, message: 'Không có quyền xem ngựa này.' },
  });
};
beforeEach(() => {
  environment.apiUrl = 'http://10.0.2.2:3000/api';
  queryClient.clear();
});
afterEach(() => {
  apiClient.defaults.adapter = original;
  queryClient.clear();
});
test('care journal checks scoped detail before GET and preserves date, cancellation and zero quantities', async () => {
  const fixture = journalFixture(),
    calls: InternalAxiosRequestConfig[] = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    return ok(config, config.url?.endsWith('/care-journal') ? fixture : { horse: scopedHorse });
  };
  const signal = new AbortController().signal,
    result = await careJournalApi.get(horseId, fixture.date, signal);
  expect(calls.map((c) => c.url)).toEqual([
    '/horses/' + horseId,
    '/horses/' + horseId + '/care-journal',
  ]);
  expect(calls[1]).toMatchObject({ params: { date: fixture.date }, signal });
  expect(result.tasks[0].feedingLeftovers?.[0].quantity).toBe(0);
  expect(result.sessions[0].distanceCompleted).toBe(0);
  expect(result.tasks[1].status).toBe('cancelled');
});
test.each([403, 404])(
  'scope rejection %s prevents journal and history requests',
  async (status) => {
    const calls: string[] = [];
    apiClient.defaults.adapter = async (config) => {
      calls.push(config.url!);
      return reject(config, status);
    };
    await expect(careJournalApi.get(horseId, journalFixture().date)).rejects.toMatchObject({
      status,
    });
    await expect(careJournalApi.history(horseId)).rejects.toMatchObject({ status });
    expect(calls).toEqual(['/horses/' + horseId, '/horses/' + horseId]);
  },
);
test('rejects invalid dates before any HTTP request and rejects wrong horse/day responses', async () => {
  let calls = 0;
  let payload = journalFixture();
  apiClient.defaults.adapter = async (config) => {
    calls++;
    return ok(config, config.url?.endsWith('/care-journal') ? payload : { horse: scopedHorse });
  };
  await expect(careJournalApi.get(horseId, '2026-02-31')).rejects.toThrow('Ngày');
  expect(calls).toBe(0);
  payload = { ...payload, horse: { ...payload.horse, _id: otherHorseId } };
  await expect(careJournalApi.get(horseId, payload.date)).rejects.toThrow('không khớp');
  payload = { ...journalFixture(), date: '2026-01-01' };
  await expect(careJournalApi.get(horseId, '2026-01-02')).rejects.toThrow('không khớp');
  expect(validJournalDay('2024-02-29')).toBe(true);
  expect(validJournalDay('2026-02-29')).toBe(false);
});
test('lock history keeps action, actor and description while discarding raw metadata and email', async () => {
  const row = {
    _id: 'lock1',
    action: 'HORSE_INTAKE_CLEARED',
    createdAt: '2026-11-09T03:00:00Z',
    description: 'Hoàn tất khám đầu vào',
    actorRole: 'veterinarian',
    actorId: { _id: 'v', fullName: 'Thu Hà', email: 'private@example.com', role: 'veterinarian' },
    metadata: { secret: 'hidden' },
    ipAddress: '127.0.0.1',
  };
  apiClient.defaults.adapter = async (config) =>
    ok(config, config.url?.endsWith('/lock-history') ? { history: [row] } : { horse: scopedHorse });
  const history = await careJournalApi.history(horseId);
  expect(history[0]).toMatchObject({
    action: row.action,
    description: row.description,
    actorId: { fullName: 'Thu Hà' },
  });
  expect(history[0]).not.toHaveProperty('metadata');
  expect(history[0].actorId).not.toHaveProperty('email');
});
test('clinical queue finds a late-page horse without unsupported list parameters', async () => {
  const params: unknown[] = [];
  apiClient.defaults.adapter = async (config) => {
    params.push(config.params);
    return ok(config, {
      horses: [
        {
          ...scopedHorse,
          _id: config.params.page === 1 ? otherHorseId : horseId,
          isTrainingLocked: config.params.page !== 1,
        },
      ],
      pagination: { page: config.params.page, limit: 50, total: 2, totalPages: 2 },
    });
  };
  const result = await loadClinicalHolds();
  expect(result.map((h) => h._id)).toEqual([horseId]);
  expect(params).toEqual([
    { page: 1, limit: 50 },
    { page: 2, limit: 50 },
  ]);
  expect(isClinicalHold({ ...scopedHorse, isTrainingLocked: false })).toBe(false);
});
test('quick clinical form reads selected horse and never carries a different horse diagnosis from cache', async () => {
  const op = findOperation('medical.encounter')!;
  queryClient.setQueryData(['operation-context', op.id, undefined], {
    record: { horseId: otherHorseId, diagnosis: 'Nội dung cũ' },
    injuries: [{ mode: 'existing', id: 'old' }],
  });
  apiClient.defaults.adapter = async (config) => ok(config, { horse: scopedHorse });
  const context = await operationsApi.context(op, undefined, undefined, 1, horseId),
    body = operationInitial(op, context);
  expect(body.record).toMatchObject({ horseId, type: 'emergency' });
  expect((body.record as Record<string, unknown>).diagnosis).not.toBe('Nội dung cũ');
  expect(body.injuries).toBeUndefined();
});
test('timeline joins task/session records with distinct IDs and filters without changing source', () => {
  const fixture = journalFixture(),
    rows = journalTimeline(fixture);
  expect(rows.map((r) => r.id)).toEqual(['session-session1', 'task-task-cancel', 'task-task-feed']);
  expect(journalTimeline(fixture, 'nutrition').map((r) => r.id)).toEqual(['task-task-feed']);
  expect(journalTimeline(fixture, 'training')[0].kind).toBe('session');
  expect(fixture.tasks[1].status).toBe('cancelled');
});
test('photo handling keeps signed URL query, rejects non-web schemes and identifies server illustration fallback', () => {
  expect(journalPhotoUrl('https://storage.example/p?token=opaque')).toBe(
    'https://storage.example/p?token=opaque',
  );
  expect(journalPhotoUrl('javascript:alert(1)')).toBeNull();
  expect(journalPhotoUrl('https://name:password@storage.example/p')).toBeNull();
  expect(illustrationPhoto('https://images.unsplash.com/horse')).toBe(true);
  expect(illustrationPhoto('https://storage.example/horse')).toBe(false);
});

test('daily health filter includes clinical visits and medication care, while feeding stays separate', () => {
  const journal = journalFixture();
  journal.medicalRecords = [
    clinicalRecordSchema.parse({
      _id: 'clinical',
      examinationDate: clubDate() + 'T01:00:00Z',
      diagnosis: 'Đã ghi nhận khám',
    }),
  ];
  journal.medicalSchedules = [
    clinicalScheduleSchema.parse({
      _id: 'vaccine',
      type: 'vaccination',
      title: 'Tiêm phòng',
      dueDate: clubDate(),
      status: 'completed',
      administration: {
        performedOn: clubDate(),
        productName: 'Sản phẩm A',
        dose: 'Theo chỉ định',
        lotNumber: 'L-01',
      },
    }),
  ];
  const health = journalTimeline(journal, 'health');
  expect(health.map((row) => row.kind)).toEqual(expect.arrayContaining(['clinical', 'care']));
  expect(journalTimeline(journal, 'nutrition').every((row) => row.kind === 'task')).toBe(true);
});
