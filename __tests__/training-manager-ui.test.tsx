import { render, screen, fireEvent, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useSession } from '@/features/auth/stores/session-store';
import type { Role } from '@/core/constants/roles';
import WorkspaceScreen from '@/features/workspace/components/workspace-screen';
import RecordScreen from '@/features/workspace/components/record-screen';
import TrainingEditorScreen from '@/features/training/components/training-editor-screen';
import { workspaceApi } from '@/features/workspace/api/workspace-api';
const mockParams: { module?: string; id?: string } = { module: 'training' };
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: { push: jest.fn(), back: jest.fn() },
}));
jest.mock('@/features/workspace/hooks/use-workspace', () => ({
  useWorkspace: () => ({
    data: { pages: [{ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }] },
    isPending: false,
    isRefetching: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/features/horses/hooks/use-horses', () => ({
  useHorses: () => ({ data: { pages: [{ items: [] }] }, hasNextPage: false }),
}));
jest.mock('@/features/workspace/api/workspace-api', () => ({
  workspaceApi: { detail: jest.fn() },
}));
const clients: QueryClient[] = [];
function user(role: Role) {
  useSession.setState({
    status: 'authenticated',
    user: {
      _id: 'manager1',
      role,
      fullName: 'Người dùng',
      email: 'staff@example.com',
      isActive: true,
    },
  });
}
async function open(element: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  clients.push(client);
  await render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}
beforeEach(() => {
  mockParams.module = 'training';
  mockParams.id = undefined;
});
afterEach(async () => {
  await cleanup();
  clients.forEach((c) => c.clear());
  clients.length = 0;
  jest.clearAllMocks();
  useSession.setState({ status: 'guest', user: null });
});
test.each(['club_manager', 'head_trainer'] as const)(
  '%s can open creation from the training workspace',
  async (role) => {
    user(role);
    await open(<WorkspaceScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Tạo giáo án' }));
    expect(router.push).toHaveBeenCalledWith('/training-editor');
  },
);
test('Manager can enter the training editor', async () => {
  user('club_manager');
  await open(<TrainingEditorScreen />);
  expect(screen.getByText('Giáo án mới')).toBeTruthy();
  expect(screen.getByLabelText('Tên giáo án')).toBeTruthy();
});
test.each(['groom', 'horse_owner', 'veterinarian', 'warehouse_keeper'] as const)(
  '%s cannot enter the training editor',
  async (role) => {
    user(role);
    await open(<TrainingEditorScreen />);
    expect(screen.getByText('Không có quyền truy cập')).toBeTruthy();
    expect(screen.queryByLabelText('Tên giáo án')).toBeNull();
  },
);
test('Manager sees editing and archive actions on an existing plan', async () => {
  user('club_manager');
  mockParams.id = 'a'.repeat(24);
  jest
    .mocked(workspaceApi.detail)
    .mockResolvedValue({ _id: mockParams.id, title: 'Giáo án đã lưu', revision: 3, exercises: [] });
  await open(<RecordScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Sửa giáo án' }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/training-editor',
    params: { id: mockParams.id },
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Thao tác với hồ sơ' }));
  expect(screen.getByRole('button', { name: 'Ngừng sử dụng giáo án' })).toBeTruthy();
});
