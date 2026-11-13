import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskDetail } from '@/features/tasks/components/task-detail-screen';
import { taskApi } from '@/features/tasks/api/task-api';
import { useTask, useRefreshTask } from '@/features/tasks/hooks/use-tasks';
import { TaskEvidence } from '@/features/tasks/components/task-evidence';
import { TaskFinishForm } from '@/features/tasks/components/task-finish-form';
import type { Task } from '@/features/tasks/types/task';
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: 'a'.repeat(24) }) }));
jest.mock('@/features/auth/stores/session-store', () => ({
  useSession: (select: (state: { user: { _id: string; role: string } }) => unknown) =>
    select({ user: { _id: 'groom-1', role: 'groom' } }),
}));
jest.mock('@/features/tasks/hooks/use-tasks', () => ({
  useTask: jest.fn(),
  useRefreshTask: jest.fn(),
}));
jest.mock('@/features/tasks/api/task-api', () => ({
  taskApi: { start: jest.fn(), cancel: jest.fn(), blockage: jest.fn() },
}));
jest.mock('@/features/tasks/components/task-evidence', () => ({
  TaskEvidence: jest.fn(() => null),
}));
jest.mock('@/features/tasks/components/task-finish-form', () => ({
  TaskFinishForm: jest.fn(() => null),
}));
jest.mock('@/features/tasks/components/task-feeding', () => ({ TaskFeeding: () => null }));
jest.mock('@/features/tasks/components/task-telemetry', () => ({ TaskTelemetry: () => null }));
jest.mock('@/features/operations/components/operation-panel', () => ({
  OperationPanel: () => null,
}));
const clients: QueryClient[] = [];
const base: Task = {
  _id: 'a'.repeat(24),
  title: 'Vệ sinh',
  type: 'bathing',
  status: 'scheduled',
  revision: 0,
  scheduledStartAt: '2099-01-01T08:00:00+07:00',
  scheduledEndAt: '2099-01-01T09:00:00+07:00',
  instructions: '',
  groomId: 'groom-1',
};
async function open(task = base) {
  jest
    .mocked(useTask)
    .mockReturnValue({ data: task, isPending: false, refetch: jest.fn() } as unknown as ReturnType<
      typeof useTask
    >);
  jest.mocked(useRefreshTask).mockReturnValue(jest.fn(async () => {}));
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <TaskDetail id={task._id} />
    </QueryClientProvider>,
  );
}
afterEach(() => {
  clients.forEach((c) => c.clear());
  clients.length = 0;
  jest.clearAllMocks();
});
test('scheduled checklist offers evidence and completion without requiring a start or waiting for the clock', async () => {
  await open();
  expect(jest.mocked(TaskEvidence).mock.calls[0][0]).toMatchObject({
    id: base._id,
    editable: true,
  });
  expect(jest.mocked(TaskFinishForm).mock.calls[0][0].task.status).toBe('scheduled');
  expect(taskApi.start).not.toHaveBeenCalled();
});
test('training start sends the selected simulation scenario', async () => {
  jest.mocked(taskApi.start).mockResolvedValue({ task: {} });
  await open({ ...base, type: 'training' });
  await fireEvent.press(screen.getByRole('button', { name: 'Kịch bản mô phỏng khi bắt đầu tập' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Cảnh báo nhịp tim' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Bắt đầu tập & mô phỏng' }));
  expect(taskApi.start).toHaveBeenCalledWith(base._id, { scenario: 'heart_rate' });
});
test('completed work keeps evidence read-only and hides completion', async () => {
  await open({ ...base, status: 'completed' });
  expect(jest.mocked(TaskEvidence).mock.calls[0][0]).toMatchObject({ editable: false });
  expect(TaskFinishForm).not.toHaveBeenCalled();
});

test('completed feeding displays the saved outcome and notes after reopening', async () => {
  await open({
    ...base,
    type: 'feeding',
    status: 'completed',
    feedingOutcome: 'refused',
    completionNotes: 'Đã báo bác sĩ',
  });
  expect(screen.getByText('Bỏ ăn')).toBeTruthy();
  expect(screen.getByText('Đã báo bác sĩ')).toBeTruthy();
});
