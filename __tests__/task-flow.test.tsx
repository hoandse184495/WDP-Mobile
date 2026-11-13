import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { taskApi } from '@/features/tasks/api/task-api';
import { TaskFinishForm } from '@/features/tasks/components/task-finish-form';
import { Task } from '@/features/tasks/types/task';
import { scheduleSchema } from '@/features/tasks/schemas/schedule-schema';
jest.mock('@/features/tasks/api/task-api', () => ({
  taskApi: { evidence: jest.fn(), feedingPreview: jest.fn(), finish: jest.fn() },
}));
const task: Task = {
  _id: 'a'.repeat(24),
  title: 'Bath',
  type: 'bathing',
  status: 'in_progress',
  revision: 1,
  scheduledStartAt: '2026-01-01T01:00:00Z',
  scheduledEndAt: '2026-01-01T02:00:00Z',
  instructions: '',
};
const clients: QueryClient[] = [];
async function renderFinish(value = task) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <TaskFinishForm task={value} />
    </QueryClientProvider>,
  );
}
afterEach(() => {
  clients.forEach((client) => client.clear());
  clients.length = 0;
  jest.clearAllMocks();
});
test('completion is disabled without evidence', async () => {
  jest
    .mocked(taskApi.evidence)
    .mockResolvedValue({ taskId: task._id, revision: 1, status: 'in_progress', photos: [] });
  await renderFinish();
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận hoàn thành' }));
  expect(taskApi.finish).not.toHaveBeenCalled();
});
test('care completion submits real notes only after evidence exists', async () => {
  jest.mocked(taskApi.evidence).mockResolvedValue({
    taskId: task._id,
    revision: 1,
    status: 'in_progress',
    photos: [{ _id: 'p1', fileName: 'proof.jpg', uploadedAt: '2026-01-01T01:00:00Z' }],
  });
  jest.mocked(taskApi.finish).mockResolvedValue({ task: {} });
  await renderFinish();
  await screen.findByRole('button', { name: 'Xác nhận hoàn thành', disabled: false });
  await fireEvent.changeText(
    screen.getByLabelText('Ghi chú kết quả'),
    'Đã hoàn thành theo hướng dẫn',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận hoàn thành' }));
  expect(taskApi.finish).toHaveBeenCalledWith(task._id, { notes: 'Đã hoàn thành theo hướng dẫn' });
});

const proof = {
  taskId: task._id,
  revision: 1,
  status: 'scheduled',
  photos: [{ _id: 'p1', fileName: 'proof.jpg', uploadedAt: '2026-01-01T01:00:00Z' }],
};
const feedingTask: Task = {
  ...task,
  status: 'scheduled',
  type: 'feeding',
  feedingStockRequired: true,
  feedingSnapshot: { meal: { name: 'Bữa sáng', lines: [] } },
};

test('scheduled care can complete directly with uploaded evidence', async () => {
  jest.mocked(taskApi.evidence).mockResolvedValue(proof);
  jest.mocked(taskApi.finish).mockResolvedValue({ task: {} });
  await renderFinish({ ...task, status: 'scheduled' });
  await screen.findByRole('button', { name: 'Xác nhận hoàn thành', disabled: false });
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận hoàn thành' }));
  expect(taskApi.finish).toHaveBeenCalledWith(task._id, { notes: '' });
});

test('meal checklist requires an explicit outcome and accepts completion without an inventory operation', async () => {
  jest.mocked(taskApi.evidence).mockResolvedValue(proof);
  jest.mocked(taskApi.finish).mockResolvedValue({ task: {} });
  await renderFinish(feedingTask);
  await screen.findByRole('button', { name: 'Xác nhận hoàn thành', disabled: false });
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận hoàn thành' }));
  expect(await screen.findByText('Chọn tình trạng ăn thực tế trước khi hoàn thành.')).toBeTruthy();
  expect(taskApi.finish).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Kết quả bữa ăn' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Bình thường' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận hoàn thành' }));
  expect(taskApi.finish).toHaveBeenCalledWith(task._id, {
    notes: '',
    feedingOutcome: 'normal',
    acknowledgeRationChange: false,
  });
  expect(taskApi.feedingPreview).not.toHaveBeenCalled();
});

test('medical checklist never assumes that physical handover and return happened', async () => {
  jest.mocked(taskApi.evidence).mockResolvedValue(proof);
  jest.mocked(taskApi.finish).mockResolvedValue({ task: {} });
  await renderFinish({
    ...task,
    status: 'scheduled',
    type: 'medical_support',
    medicalScheduleId: 'b'.repeat(24),
  });
  await screen.findByRole('button', { name: 'Xác nhận hoàn thành', disabled: false });
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận hoàn thành' }));
  expect(taskApi.finish).toHaveBeenCalledWith(task._id, { notes: '' });
});

test('a training hold still blocks direct completion even when evidence exists', async () => {
  jest.mocked(taskApi.evidence).mockResolvedValue(proof);
  await renderFinish({ ...task, status: 'scheduled', blockedReason: 'Đang chờ bác sĩ kiểm tra' });
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận hoàn thành' }));
  expect(taskApi.finish).not.toHaveBeenCalled();
});

test('scheduler requires an approved ration/meal and rejects impossible local dates', () => {
  const input = {
    title: 'Feed',
    type: 'feeding',
    groomId: 'a'.repeat(24),
    horseId: 'b'.repeat(24),
    stallId: '',
    trainingPlanId: '',
    trainingExerciseKey: '',
    rationPlanId: '',
    rationMealKey: '',
    start: '2026-01-01T08:00',
    end: '2026-01-01T09:00',
    instructions: '',
  };
  expect(scheduleSchema.safeParse(input).success).toBe(false);
  expect(
    scheduleSchema.safeParse({ ...input, rationPlanId: 'c'.repeat(24), rationMealKey: 'breakfast' })
      .success,
  ).toBe(true);
  expect(
    scheduleSchema.safeParse({
      ...input,
      type: 'bathing',
      start: '2026-02-30T08:00',
      end: '2026-02-30T09:00',
    }).success,
  ).toBe(false);
});
