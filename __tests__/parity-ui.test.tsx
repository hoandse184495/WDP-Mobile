import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useSession } from '@/features/auth/stores/session-store';
import { HorseIdentity } from '@/features/horses/components/horse-identity';
import { StallDetails } from '@/features/stables/components/stall-details';
import { AuditChanges } from '@/features/audit/components/audit-changes';
import { horseSchema } from '@/features/horses/types/horse';
import SessionReviewScreen from '@/features/training/components/session-review-screen';
import { sessionApi } from '@/features/training/api/session-api';
import { trainingApi } from '@/features/training/api/training-api';
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'a'.repeat(24) }),
  router: { push: jest.fn(), back: jest.fn() },
}));
jest.mock('@/features/training/api/session-api', () => ({ sessionApi: { get: jest.fn() } }));
jest.mock('@/features/training/api/training-api', () => ({ trainingApi: { review: jest.fn() } }));
const id = 'a'.repeat(24),
  horseId = 'b'.repeat(24);
const session = {
  _id: id,
  horseId: { _id: horseId, name: 'Thanh Phong' },
  status: 'completed',
  performanceRating: 4,
  trainerNotes: 'Giữ nhịp chạy ổn định',
  distanceCompleted: 1200,
  maxHeartRate: 160,
  trainingSnapshot: { title: 'Chạy nhẹ' },
};
const clients: QueryClient[] = [];
function user(role = 'head_trainer') {
  useSession.setState({
    status: 'authenticated',
    user: {
      _id: 'trainer',
      fullName: 'HLV',
      email: 'hlv@example.com',
      role: role as 'head_trainer',
      isActive: true,
    },
  });
}
async function openReview() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  clients.push(client);
  await render(
    <QueryClientProvider client={client}>
      <SessionReviewScreen />
    </QueryClientProvider>,
  );
  return client;
}
beforeEach(() => {
  user();
  jest.mocked(sessionApi.get).mockResolvedValue(session);
  jest.mocked(trainingApi.review).mockResolvedValue({});
});
afterEach(async () => {
  await cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  jest.resetAllMocks();
  useSession.setState({ status: 'guest', user: null });
});
test('shows saved horse chip/passport and handles an older profile without identity', async () => {
  const base = {
    _id: horseId,
    name: 'Thanh Phong',
    registrationCode: 'AP-206',
    breed: 'Thoroughbred',
    gender: 'stallion',
    dateOfBirth: '2021-03-15',
    fitnessScore: 80,
    healthStatus: 'ready',
    isTrainingLocked: false,
  };
  const { rerender } = await render(
    <HorseIdentity
      horse={horseSchema.parse({
        ...base,
        identity: {
          microchipNumber: 'CHIP-206',
          passportNumber: 'PASS-206',
          registryName: 'An Phú',
        },
      })}
    />,
  );
  expect(screen.getByText('CHIP-206')).toBeTruthy();
  expect(screen.getByText('PASS-206')).toBeTruthy();
  await rerender(<HorseIdentity horse={horseSchema.parse(base)} />);
  expect(screen.getAllByText('Chưa bổ sung')).toHaveLength(5);
});
const detail = {
  _id: 'stall1',
  occupied: true,
  _details: {
    occupancy: {
      horseId: { _id: horseId, name: 'Thanh Phong', registrationCode: 'AP-206' },
      startedAt: '2026-11-09T01:00:00Z',
    },
    groom: { fullName: 'Nguyễn An' },
    tasks: [
      {
        _id: id,
        title: 'Tắm buổi sáng',
        type: 'bathing',
        status: 'completed',
        groomId: { fullName: 'Nguyễn An' },
        scheduledStartAt: '2026-11-09T01:00:00Z',
        scheduledEndAt: '2026-11-09T02:00:00Z',
      },
    ],
    historyAllowed: true,
    history: [
      {
        _id: 'stay1',
        horseId: { name: 'Ngựa trước' },
        isActive: false,
        reason: 'Chuyển ô',
        startedAt: '2026-11-08T01:00:00Z',
        endedAt: '2026-11-09T01:00:00Z',
      },
    ],
  },
};
test('manager sees current horse, groom, daily tasks and can expand permitted occupancy history', async () => {
  user('club_manager');
  await render(<StallDetails record={detail} />);
  expect(screen.getByText('Thanh Phong')).toBeTruthy();
  expect(screen.getAllByText('Nguyễn An')).toHaveLength(2);
  expect(screen.getByText('Tắm buổi sáng')).toBeTruthy();
  expect(screen.queryByText('Ngựa trước')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Xem lịch sử lưu trú' }));
  expect(screen.getByText('Ngựa trước')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Mở hồ sơ ngựa' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/horses/[id]', params: { id: horseId } });
});
test('Vet cannot open task route or Manager occupancy history even if a response contains it', async () => {
  user('veterinarian');
  await render(<StallDetails record={detail} />);
  expect(screen.queryByRole('button', { name: 'Mở công việc' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Xem lịch sử lưu trú' })).toBeNull();
});
test('manager still needs server historyAllowed and scoped horse information', async () => {
  user('club_manager');
  await render(
    <StallDetails
      record={{
        _id: 'stall',
        occupied: true,
        _details: { historyAllowed: false, tasks: [], occupancy: null },
      }}
    />,
  );
  expect(screen.getByText('Ô có ngựa ngoài phạm vi hồ sơ được xem.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Mở hồ sơ ngựa' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Xem lịch sử lưu trú' })).toBeNull();
});
test('audit displays the reason and before/after values, without unchanged fields', async () => {
  await render(
    <AuditChanges
      metadata={{
        reason: 'Đối chiếu kết quả đã ghi',
        before: { performanceRating: 3, trainerNotes: 'Không đổi' },
        after: { performanceRating: 4, trainerNotes: 'Không đổi' },
      }}
    />,
  );
  expect(screen.getByText('Đối chiếu kết quả đã ghi')).toBeTruthy();
  expect(screen.getByText('3')).toBeTruthy();
  expect(screen.getByText('4')).toBeTruthy();
  expect(screen.queryByText('Không đổi')).toBeNull();
});
test('review loads saved scores and notes and preserves notes when changing the rating', async () => {
  await openReview();
  expect(await screen.findAllByText('Thanh Phong')).toHaveLength(2);
  expect(screen.getByText('1.200')).toBeTruthy();
  expect(screen.getByLabelText('Nhận xét huấn luyện viên').props.value).toBe(session.trainerNotes);
  expect(
    screen.getByRole('button', { name: 'Mức đánh giá / 5' }).props.accessibilityValue.text,
  ).toBe('4');
  await fireEvent.press(screen.getByRole('button', { name: 'Mức đánh giá / 5' }));
  await fireEvent.press(screen.getByRole('radio', { name: '5' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu đánh giá' }));
  await waitFor(() => expect(router.back).toHaveBeenCalled());
  expect(trainingApi.review).toHaveBeenCalledWith(
    id,
    expect.objectContaining({ performanceRating: 5, trainerNotes: session.trainerNotes }),
  );
});
test('unreviewed session has no automatic rating and cannot submit without a choice', async () => {
  jest
    .mocked(sessionApi.get)
    .mockResolvedValue({ ...session, performanceRating: null, trainerNotes: '' });
  await openReview();
  await screen.findByRole('button', { name: 'Lưu đánh giá' });
  expect(
    screen.getByRole('button', { name: 'Mức đánh giá / 5' }).props.accessibilityValue.text,
  ).toBe('Chưa chọn');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu đánh giá' }));
  expect(await screen.findByText('Chọn mức đánh giá trước khi lưu.')).toBeTruthy();
  expect(trainingApi.review).not.toHaveBeenCalled();
});
test('a failed load offers retry instead of an empty editable review', async () => {
  jest.mocked(sessionApi.get).mockRejectedValueOnce(new Error('Không tải được buổi tập'));
  await openReview();
  await screen.findByText('Không tải được buổi tập');
  expect(screen.queryByRole('button', { name: 'Lưu đánh giá' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByLabelText('Nhận xét huấn luyện viên')).toBeTruthy();
});
test('cancelled session cannot be reviewed', async () => {
  jest.mocked(sessionApi.get).mockResolvedValue({ ...session, status: 'cancelled' });
  await openReview();
  expect(await screen.findByText('Buổi tập chưa đủ điều kiện đánh giá')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Lưu đánh giá' })).toBeNull();
});
test('non-trainer role cannot load the trainer review form', async () => {
  user('groom');
  await openReview();
  expect(screen.getByText('Không có quyền truy cập')).toBeTruthy();
  expect(sessionApi.get).not.toHaveBeenCalled();
});

test('background refresh does not replace an unsaved trainer note', async () => {
  const client = await openReview();
  const field = await screen.findByLabelText('Nhận xét huấn luyện viên');
  await fireEvent.changeText(field, 'Nội dung đang soạn');
  jest.mocked(sessionApi.get).mockResolvedValue({ ...session, trainerNotes: 'Bản vừa được tải' });
  await client.invalidateQueries({ queryKey: ['record', 'sessions', id] });
  expect(screen.getByLabelText('Nhận xét huấn luyện viên').props.value).toBe('Nội dung đang soạn');
});
