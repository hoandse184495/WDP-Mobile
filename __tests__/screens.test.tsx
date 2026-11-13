import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';
import LoginScreen from '@/features/auth/screens/login-screen';
import HorsesScreen from '@/features/horses/components/horses-screen';
import { horseApi } from '@/features/horses/api/horse-api';
import { signIn } from '@/features/auth/utils/session';
import { useSession } from '@/features/auth/stores/session-store';
import { RoleGuard } from '@/shared/components/role-guard';
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('@/features/auth/utils/session', () => ({ signIn: jest.fn() }));
jest.mock('@/features/horses/api/horse-api', () => ({ horseApi: { list: jest.fn() } }));
const user = {
  _id: 'u1',
  fullName: 'Staff',
  email: 'staff@example.com',
  role: 'groom' as const,
  isActive: true,
};
const clients: QueryClient[] = [];
const wrap = async (element: React.ReactElement) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(client);
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
};
afterEach(() => {
  clients.forEach((client) => client.clear());
  clients.length = 0;
});
beforeEach(() => {
  jest.clearAllMocks();
  useSession.setState({ status: 'guest', user: null, error: null });
});
test('login displays backend failure and stays on login', async () => {
  jest.mocked(signIn).mockRejectedValueOnce(new Error('Invalid credentials'));
  await wrap(<LoginScreen />);
  await fireEvent.changeText(screen.getByLabelText('Email'), 'staff@example.com');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'wrong');
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByText('Invalid credentials')).toBeTruthy();
  expect(useSession.getState().status).toBe('guest');
});
test('horses shows empty state after a successful empty API response', async () => {
  useSession.setState({ status: 'authenticated', user });
  jest
    .mocked(horseApi.list)
    .mockResolvedValue({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  await wrap(<HorsesScreen />);
  expect(await screen.findByText('Không tìm thấy ngựa')).toBeTruthy();
});
test('horses displays loading and retryable failure', async () => {
  useSession.setState({ status: 'authenticated', user });
  jest.mocked(horseApi.list).mockImplementationOnce(() => new Promise(() => {}));
  const first = await wrap(<HorsesScreen />);
  expect(screen.getByText('Đang tải dữ liệu…')).toBeTruthy();
  await first.unmount();
  jest.mocked(horseApi.list).mockRejectedValue(new Error('Server unavailable'));
  await wrap(<HorsesScreen />);
  expect(await screen.findByText('Server unavailable')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy();
});
test('role guard blocks direct access to manager-only content', async () => {
  useSession.setState({ status: 'authenticated', user });
  await wrap(
    <RoleGuard roles={['club_manager']}>
      <Text>Private manager page</Text>
    </RoleGuard>,
  );
  await waitFor(() => expect(screen.queryByText('Private manager page')).toBeNull());
  expect(screen.getByText('Không có quyền truy cập')).toBeTruthy();
});
