import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StableMap } from '@/features/stables/components/stable-map';
import { stableMapCells } from '@/features/stables/utils/stable-map';
import type { JsonRecord } from '@/features/operations/types/operation';
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
const record = (): JsonRecord => ({
  floorPlan: {
    width: 1000,
    height: 600,
    items: [
      { id: 'a', type: 'stall', stallId: 's1', label: '', x: 0, y: 0, width: 180, height: 180 },
      {
        id: 'b',
        type: 'stall',
        stallId: { _id: 's2' },
        label: '',
        x: 200,
        y: 0,
        width: 180,
        height: 180,
      },
      {
        id: 'c',
        type: 'restricted',
        label: 'Ngoài phạm vi xem',
        x: 400,
        y: 0,
        width: 180,
        height: 180,
      },
      { id: 'd', type: 'aisle', label: 'Lối chăm sóc', x: 0, y: 200, width: 1000, height: 100 },
      { id: 'e', type: 'stall', stallId: 's3', label: '', x: 0, y: 400, width: 180, height: 180 },
    ],
  },
  _details: {
    stalls: [
      { _id: 's1', code: 'A-01', occupied: true },
      { _id: 's2', code: 'A-02', occupied: true },
      { _id: 's3', code: 'A-03', occupied: false },
    ],
    occupancies: [
      {
        stallId: { _id: 's1' },
        horseId: {
          _id: 'h1',
          name: 'Hồng Phong',
          registrationCode: 'AP-101',
          healthStatus: 'monitoring',
          isTrainingLocked: true,
        },
      },
    ],
  },
});
afterEach(async () => {
  await cleanup();
  jest.clearAllMocks();
});
test('blank projected labels fall back to stall code and scoped occupancy supplies health', () => {
  const cells = stableMapCells(record());
  expect(cells[0]).toMatchObject({
    label: 'A-01',
    occupant: 'Hồng Phong',
    status: 'Cần theo dõi · Khóa tập',
    stroke: '#D97706',
  });
  expect(cells[1]).toMatchObject({
    label: 'A-02',
    occupant: 'Ngựa ngoài phạm vi',
    status: 'Có ngựa',
  });
  expect(cells[2]).toMatchObject({ label: 'Ngoài phạm vi xem', restricted: true, stallId: '' });
  expect(cells[4]).toMatchObject({ label: 'A-03', occupant: 'Chưa có ngựa', status: 'Trống' });
});
test('restricted or missing stalls never expose occupant or navigable IDs', () => {
  const value = record();
  value._details = {
    stalls: [],
    occupancies: [{ stallId: 's1', horseId: { _id: 'private', name: 'Hidden horse' } }],
  };
  const cells = stableMapCells(value);
  expect(cells[0].stallId).toBe('');
  expect(cells[0].horse).toBeUndefined();
  expect(cells[0].occupant).toBe('');
});
test('inactive historic occupancies do not populate a current stall', () => {
  const value = record();
  value._details = {
    stalls: [{ _id: 's1', code: 'A-01', occupied: false }],
    occupancies: [{ isActive: false, stallId: 's1', horseId: { _id: 'h', name: 'Old horse' } }],
  };
  expect(stableMapCells(value)[0].occupant).toBe('Chưa có ngựa');
});
test('Android map shows codes, horse, warnings and opens existing stall detail screen', async () => {
  await render(<StableMap record={record()} />);
  expect(screen.getAllByText('A-01').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Hồng Phong').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Cần theo dõi · Khóa tập').length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByRole('button', { name: 'Xem chi tiết ô A-01' }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/records/[module]/[id]',
    params: { module: 'stalls', id: 's1' },
  });
  expect(screen.queryByRole('button', { name: 'Ngoài phạm vi xem' })).toBeNull();
});
test('search matches registration code and filters readable stall list', async () => {
  await render(<StableMap record={record()} />);
  await fireEvent.changeText(screen.getByLabelText('Tìm mã ô hoặc tên ngựa'), 'AP-101');
  expect(screen.getByRole('button', { name: 'Xem chi tiết ô A-01' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Xem chi tiết ô A-02' })).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Tìm mã ô hoặc tên ngựa'), 'khong co');
  expect(screen.getByText('Không có ô phù hợp')).toBeTruthy();
});
test('health and training lock remain separate and maintenance is explicit', () => {
  const value = record();
  value._details = {
    stalls: [{ _id: 's1', code: 'A-01', occupied: true, maintenance: true }],
    occupancies: [
      {
        stallId: 's1',
        horseId: { _id: 'h', name: 'Ngựa', healthStatus: 'injured', isTrainingLocked: false },
      },
    ],
  };
  expect(stableMapCells(value)[0].status).toBe('Bảo trì');
});
