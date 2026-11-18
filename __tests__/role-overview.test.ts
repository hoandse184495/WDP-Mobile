import { loadRoleOverview } from '@/features/home/api/role-overview';
import { horseApi } from '@/features/horses/api/horse-api';
import { workspaceApi } from '@/features/workspace/api/workspace-api';
import { loadDashboard } from '@/features/home/api/dashboard-api';
import type { Horse } from '@/features/horses/types/horse';
import type { WorkspaceRecord } from '@/features/workspace/types/catalog';

jest.mock('@/features/horses/api/horse-api', () => ({ horseApi: { list: jest.fn() } }));
jest.mock('@/features/workspace/api/workspace-api', () => ({ workspaceApi: { list: jest.fn() } }));
jest.mock('@/features/home/api/dashboard-api', () => ({ loadDashboard: jest.fn() }));
const page = <T>(items: T[], number = 1, pages = 1) => ({
  items,
  pagination: { page: number, limit: 50, total: items.length, totalPages: pages },
});
const horse = (id: string, extra: Partial<Horse> = {}): Horse => ({
  _id: id,
  name: id,
  registrationCode: id,
  breed: 'Thoroughbred',
  gender: 'male',
  dateOfBirth: '2020-01-01',
  fitnessScore: 80,
  healthStatus: 'ready',
  isTrainingLocked: false,
  ...extra,
});
beforeEach(() => {
  jest.resetAllMocks();
});
afterEach(() => {
  jest.restoreAllMocks();
});

test('owner summary includes all horse pages and links to read-only clinical and training screens', async () => {
  jest
    .mocked(horseApi.list)
    .mockResolvedValueOnce(page([horse('h1')], 1, 2))
    .mockResolvedValueOnce(
      page([horse('h2', { fitnessScore: 60, healthStatus: 'monitoring' })], 2, 2),
    );
  jest
    .mocked(workspaceApi.list)
    .mockImplementation(async (module) =>
      page(
        module === 'sessions'
          ? [{ _id: 's1', horseId: { _id: 'h1', name: 'Horse 1' }, trainerNotes: 'Good progress' }]
          : [],
      ),
    );
  const result = await loadRoleOverview('horse_owner');
  expect(horseApi.list).toHaveBeenCalledTimes(2);
  expect(result.metrics.map((metric) => metric.value)).toEqual([2, '70.0%', 0, '1 / 2']);
  expect(result.sections[0].items).toHaveLength(2);
  expect(result.sections[1].items[0].path).toBe('/records/sessions/s1');
  expect(jest.mocked(workspaceApi.list).mock.calls.map(([module]) => module)).not.toContain(
    'injuries',
  );
});

test('vet prioritizes unresolved severe injuries and reads active care schedules', async () => {
  jest.mocked(horseApi.list).mockResolvedValue(page([horse('h1', { isTrainingLocked: true })]));
  const injuries: WorkspaceRecord[] = [
    { _id: 'i1', status: 'active', severity: 'minor' },
    { _id: 'i2', status: 'recovering', severity: 'critical' },
    { _id: 'i3', status: 'resolved', severity: 'severe' },
  ];
  const records: WorkspaceRecord[] = [
    { _id: 'old', horseId: 'h1', examinationDate: '2026-01-01', nextCheckupDate: '2026-01-02' },
    { _id: 'new', horseId: 'h1', examinationDate: '2026-02-01', nextCheckupDate: '2026-02-03' },
  ];
  jest.mocked(workspaceApi.list).mockImplementation(async (module) =>
    page(
      module === 'injuries'
        ? injuries
        : module === 'medical'
          ? records
          : [
              { _id: 'pending', status: 'scheduled', dueDate: '2026-01-01', type: 'vaccination' },
              { _id: 'closed', status: 'completed', dueDate: '2025-01-01', type: 'follow_up' },
            ],
    ),
  );
  const result = await loadRoleOverview('veterinarian');
  expect(result.metrics.map((metric) => metric.value)).toEqual([2, 1, 1, 2, 0]);
  expect(result.sections[0].items.map((item) => item.id)).toEqual(['i2', 'i1']);
  expect(result.sections[1].items.map((item) => item.id)).toEqual(['pending']);
  expect(result.sections[1].items[0].path).toBe('/records/schedules/pending');
});

test('groom excludes locked and expired plans and cancelled session alerts', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-15'));
  jest
    .mocked(horseApi.list)
    .mockResolvedValue(page([horse('h1'), horse('h2', { isTrainingLocked: true })]));
  const plans: WorkspaceRecord[] = [
    { _id: 'p1', horseId: 'h1', startDate: '2026-06-01', endDate: '2026-06-30' },
    { _id: 'p2', horseId: 'h2', startDate: '2026-06-01', endDate: '2026-06-30' },
    { _id: 'p3', horseId: 'h1', startDate: '2026-01-01', endDate: '2026-02-01' },
  ];
  const sessions: WorkspaceRecord[] = [
    { _id: 's1', status: 'completed', alertTriggered: true },
    { _id: 's2', status: 'cancelled', alertTriggered: true },
  ];
  jest
    .mocked(workspaceApi.list)
    .mockImplementation(async (module) => page(module === 'training' ? plans : sessions));
  const result = await loadRoleOverview('groom');
  expect(result.metrics.map((metric) => metric.value)).toEqual([1, 1, 1, 1]);
  expect(result.sections[0].items.map((item) => item.id)).toEqual(['p1']);
});

test('trainer review queue follows every page and counts all history', async () => {
  jest
    .mocked(loadDashboard)
    .mockResolvedValue({ metrics: [{ label: 'Chờ đánh giá', value: 0 }], alerts: [] });
  jest
    .mocked(workspaceApi.list)
    .mockResolvedValueOnce(
      page([{ _id: 's1', performanceRating: null, sessionDate: '2025-01-01' }], 1, 2),
    )
    .mockResolvedValueOnce(
      page([{ _id: 's2', performanceRating: 4, sessionDate: '2026-01-01' }], 2, 2),
    );
  const result = await loadRoleOverview('head_trainer');
  expect(result.metrics).toEqual([{ label: 'Chờ đánh giá / toàn bộ', value: 1 }]);
  expect(result.sections[0].items[0].path).toBe('/session-review/s1');
  expect(workspaceApi.list).toHaveBeenCalledTimes(2);
});

test('overview propagates API failure without showing invented zero counts', async () => {
  jest.mocked(horseApi.list).mockRejectedValue(new Error('Server unavailable'));
  await expect(loadRoleOverview('horse_owner')).rejects.toThrow('Server unavailable');
});

test('Vet overview highlights emergency holds awaiting examination', async () => {
  jest.mocked(horseApi.list).mockResolvedValue(
    page([
      horse('hold', {
        isTrainingLocked: true,
        trainingLockReason: 'Tạm khóa khẩn cấp: quan sát bất thường (Chờ khám xác nhận)',
      }),
      horse('healthy'),
    ]),
  );
  jest.mocked(workspaceApi.list).mockResolvedValue(page([]));
  const data = await loadRoleOverview('veterinarian');
  expect(data.metrics).toContainEqual({ label: 'Cần khám xác nhận', value: 1 });
  expect(data.sections[0].items).toEqual([
    expect.objectContaining({ id: 'hold', danger: true, path: '/horses/hold' }),
  ]);
});
