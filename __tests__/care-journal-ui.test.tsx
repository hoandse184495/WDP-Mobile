import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AppError } from '@/core/errors/app-error';
import { clubDate, shiftDay } from '@/core/utils/date';
import { allRoles } from '@/core/constants/roles';
import { useSession } from '@/features/auth/stores/session-store';
import CareJournalScreen from '@/features/horses/components/care-journal-screen';
import { JournalEntry } from '@/features/horses/components/journal-entry';
import { HorseLockHistory } from '@/features/horses/components/horse-lock-history';
import {
  ClinicalHoldNotice,
  HorseTrainingActions,
} from '@/features/horses/components/training-hold';
import { careJournalApi } from '@/features/horses/api/care-journal-api';
import { journalTimeline } from '@/features/horses/utils/care-journal';
import { journalFixture, horseId, scopedHorse } from './fixtures/care-journal';
import type { CareJournal } from '@/features/horses/types/care-journal';
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'a'.repeat(24) }),
  Redirect: () => null,
}));
jest.mock('@/features/horses/api/care-journal-api', () => ({
  careJournalApi: { get: jest.fn(), history: jest.fn() },
}));
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('@/shared/components/date-field', () => ({
  DateField: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => {
    const { TextInput } = require('react-native');
    return <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} />;
  },
}));
const clients: QueryClient[] = [];
async function mount(element: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(client);
  return {
    client,
    ...(await render(<QueryClientProvider client={client}>{element}</QueryClientProvider>)),
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  useSession.setState({
    status: 'authenticated',
    user: {
      _id: 'owner',
      fullName: 'Chủ ngựa',
      email: 'owner@example.com',
      role: 'horse_owner',
      isActive: true,
    },
  });
  jest.mocked(careJournalApi.get).mockResolvedValue(journalFixture());
  jest.mocked(careJournalApi.history).mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((c) => c.clear());
  useSession.setState({ status: 'guest', user: null });
});
test('owner journal loads selected horse/date and category filters only visible activities', async () => {
  await mount(<CareJournalScreen />);
  expect(await screen.findByText('Thanh Phong')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Xem tổng hợp trong ngày' }));
  expect(screen.getByText('1/3')).toBeTruthy();
  expect(screen.getByText('Giáo án phục hồi')).toBeTruthy();
  expect(screen.getByText('Đã hủy')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Nhóm hoạt động' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Bữa ăn' }));
  expect(screen.queryByText('Giáo án phục hồi')).toBeNull();
  expect(screen.getByText('Bữa sáng')).toBeTruthy();
  expect(careJournalApi.get).toHaveBeenCalledWith(horseId, clubDate(), expect.anything());
});
test('task detail expands saved feeding outcome, zero leftovers and private photo preview', async () => {
  const entry = journalTimeline(journalFixture(), 'nutrition')[0];
  await mount(<JournalEntry entry={entry} reload={jest.fn()} />);
  expect(screen.queryByText('Ăn hết khẩu phần theo ghi nhận')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Xem chi tiết hoạt động' }));
  expect(screen.getByText('Ăn bình thường')).toBeTruthy();
  expect(screen.getByText('0 kg')).toBeTruthy();
  expect(screen.getByText('Khẩu phần thể lực')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Xem ảnh bua-sang.jpg' }));
  expect(screen.getByLabelText('Ảnh phóng to bua-sang.jpg').props.cachePolicy).toBe('none');
  await fireEvent.press(screen.getByRole('button', { name: 'Đóng ảnh' }));
  expect(screen.queryByLabelText('Ảnh phóng to bua-sang.jpg')).toBeNull();
});
test('failed or expired photo offers reload and illustration fallback stays identified', async () => {
  const entry = journalTimeline(journalFixture(), 'nutrition')[0];
  if (entry.kind !== 'task') throw Error('fixture');
  entry.record.photos[0].url = 'https://images.unsplash.com/horse';
  const reload = jest.fn();
  await mount(<JournalEntry entry={entry} reload={reload} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Xem chi tiết hoạt động' }));
  expect(screen.getByText('Ảnh minh họa do máy chủ cung cấp.')).toBeTruthy();
  await fireEvent(screen.getByLabelText('bua-sang.jpg'), 'error', { error: 'expired' });
  await fireEvent.press(screen.getByRole('button', { name: 'Tải lại ảnh nhật ký' }));
  expect(reload).toHaveBeenCalledTimes(1);
});
test('switching date ignores an old response and aborts the old query signal', async () => {
  let resolveOld!: (data: CareJournal) => void;
  const today = clubDate(),
    yesterday = shiftDay(today, -1);
  jest
    .mocked(careJournalApi.get)
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveOld = r;
        }),
    )
    .mockResolvedValueOnce({
      ...journalFixture(yesterday),
      horse: { ...journalFixture().horse, name: 'Nhật ký hôm qua' },
    });
  await mount(<CareJournalScreen />);
  await waitFor(() => expect(careJournalApi.get).toHaveBeenCalledTimes(1));
  const signal = jest.mocked(careJournalApi.get).mock.calls[0][2]!;
  await fireEvent.changeText(screen.getByLabelText('Ngày nhật ký'), yesterday);
  expect(await screen.findByText('Nhật ký hôm qua')).toBeTruthy();
  expect(signal.aborted).toBe(true);
  await act(() =>
    resolveOld({ ...journalFixture(), horse: { ...journalFixture().horse, name: 'Phản hồi cũ' } }),
  );
  expect(screen.queryByText('Phản hồi cũ')).toBeNull();
});
test('403 on refresh hides previously loaded journal content and offers retry', async () => {
  const { client } = await mount(<CareJournalScreen />);
  expect(await screen.findByText('Thanh Phong')).toBeTruthy();
  jest.mocked(careJournalApi.get).mockRejectedValue(new AppError('Quyền xem đã thay đổi.', 403));
  await act(() => client.invalidateQueries({ queryKey: ['horse-care-journal'] }));
  expect(await screen.findByText('Quyền xem đã thay đổi.')).toBeTruthy();
  expect(screen.queryByText('Bữa sáng')).toBeNull();
  expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy();
});
test('empty journal is distinct from an error and invalid day never starts a new request', async () => {
  jest
    .mocked(careJournalApi.get)
    .mockResolvedValue({ ...journalFixture(), tasks: [], sessions: [] });
  await mount(<CareJournalScreen />);
  expect(await screen.findByText('Chưa có hoạt động phù hợp trong ngày này')).toBeTruthy();
  const calls = jest.mocked(careJournalApi.get).mock.calls.length;
  await fireEvent.changeText(screen.getByLabelText('Ngày nhật ký'), '2026-02-31');
  expect(screen.getByText('Chọn đúng ngựa và ngày nhật ký hợp lệ.')).toBeTruthy();
  expect(careJournalApi.get).toHaveBeenCalledTimes(calls);
});
test('warehouse keeper cannot request horse journal through a direct route', async () => {
  useSession.setState({ user: { ...useSession.getState().user!, role: 'warehouse_keeper' } });
  await mount(<CareJournalScreen />);
  expect(careJournalApi.get).not.toHaveBeenCalled();
});
test('lock history loads only when opened and identifies intake clearance separately from emergency unlock', async () => {
  jest.mocked(careJournalApi.history).mockResolvedValue([
    {
      _id: 'one',
      action: 'HORSE_INTAKE_CLEARED',
      createdAt: '2026-11-09T01:00:00Z',
      description: 'Đã kiểm tra đầu vào',
      actorRole: 'veterinarian',
      actorId: { _id: 'vet', fullName: 'Thu Hà' },
    },
  ]);
  await mount(<HorseLockHistory id={horseId} />);
  expect(careJournalApi.history).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Xem lịch sử khóa huấn luyện' }));
  expect(await screen.findByText('Hoàn tất khám đầu vào')).toBeTruthy();
  expect(screen.getByText('Thu Hà')).toBeTruthy();
  expect(screen.getByText('Đã kiểm tra đầu vào')).toBeTruthy();
});
test.each(allRoles)(
  'training lock action respects %s permissions and uses the selected horse',
  async (role) => {
    useSession.setState({ user: { ...useSession.getState().user!, role } });
    await mount(<HorseTrainingActions horse={scopedHorse} />);
    if (['club_manager', 'veterinarian'].includes(role)) {
      await fireEvent.press(screen.getByRole('button', { name: 'Mở khóa huấn luyện' }));
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/operations/[operation]',
        params: { operation: 'horses.emergency-unlock', id: horseId },
      });
    } else expect(screen.queryByRole('button', { name: 'Mở khóa huấn luyện' })).toBeNull();
  },
);
test('vet can open prefilled encounter; owner sees status without a clinical write action', async () => {
  const { rerender } = await mount(<ClinicalHoldNotice horse={scopedHorse} />);
  expect(screen.queryByRole('button', { name: 'Khám xác nhận cho ngựa này' })).toBeNull();
  await act(() =>
    useSession.setState({ user: { ...useSession.getState().user!, role: 'veterinarian' } }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Khám xác nhận cho ngựa này' }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/operations/[operation]',
    params: { operation: 'medical.encounter', horseId },
  });
  await rerender(
    <QueryClientProvider client={clients[0]}>
      <ClinicalHoldNotice horse={{ ...scopedHorse, isTrainingLocked: false }} />
    </QueryClientProvider>,
  );
  expect(screen.queryByText('Tạm khóa huấn luyện · Chờ khám xác nhận')).toBeNull();
});
