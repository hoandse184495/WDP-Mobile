import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { environment } from '@/core/config/environment';
import { apiClient } from '@/core/network/api-client';
import { queryClient } from '@/core/network/query-client';
import { authKeys } from '@/features/auth/api/auth-keys';
import { SessionBootstrap } from '@/features/auth/components/session-bootstrap';
import { useSessionLifecycle } from '@/features/auth/hooks/use-session-lifecycle';
import LoginScreen from '@/features/auth/screens/login-screen';
import ProfileScreen from '@/features/profile/screens/profile-screen';
import { useSession } from '@/features/auth/stores/session-store';
import { signIn, signOut } from '@/features/auth/utils/session';
import { User } from '@/features/auth/types/auth';
import { allRoles, roleLabels } from '@/core/constants/roles';

const originalUser: User = {
  _id: 'a'.repeat(24),
  fullName: 'Người dùng kiểm thử',
  email: 'staff@example.com',
  role: 'groom',
  isActive: true,
  phone: null,
};
let serverUser: User;
let storedToken: string | null;
let calls: string[];
const ok = (config: InternalAxiosRequestConfig, data: unknown) => ({
  config,
  status: 200,
  statusText: 'OK',
  headers: {},
  data: { success: true, data },
});
const reject = (config: InternalAxiosRequestConfig, status: number, message: string): never => {
  throw new AxiosError('Request rejected', 'ERR_BAD_RESPONSE', config, undefined, {
    config,
    status,
    statusText: '',
    headers: {},
    data: { success: false, message },
  });
};
const defaultAdapter = async (config: InternalAxiosRequestConfig) => {
  calls.push(`${config.method} ${config.url}`);
  if (config.url === '/auth/login')
    return ok(config, { user: serverUser, token: 'test-access-token' });
  if (config.url === '/auth/me') return ok(config, { user: serverUser });
  if (config.url === '/auth/change-password')
    return ok(config, { changed: true, loginRequired: true });
  return reject(config, 404, 'Unexpected endpoint in auth module');
};
function AuthHarness() {
  useSessionLifecycle();
  const status = useSession((state) => state.status);
  return (
    <SessionBootstrap>
      {status === 'authenticated' ? <ProfileScreen /> : <LoginScreen />}
    </SessionBootstrap>
  );
}
async function openApp(token: string | null = null) {
  storedToken = token;
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthHarness />
    </QueryClientProvider>,
  );
}
async function fillLogin(email = 'staff@example.com', password = 'test-password') {
  await screen.findByLabelText('Email');
  await fireEvent.changeText(screen.getByLabelText('Email'), email);
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), password);
}
async function enterAccount() {
  await openApp();
  await fillLogin();
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  await screen.findByText(originalUser.fullName);
}
async function fillPassword(confirm = 'new-password-2026') {
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu hiện tại'), 'old-password');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'new-password-2026');
  await fireEvent.changeText(screen.getByLabelText('Xác nhận mật khẩu mới'), confirm);
}
beforeEach(async () => {
  await signOut();
  jest.clearAllMocks();
  serverUser = { ...originalUser };
  storedToken = null;
  calls = [];
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async () => storedToken);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (_key, value) => {
    storedToken = value;
  });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async () => {
    storedToken = null;
  });
  environment.apiUrl = 'http://10.0.2.2:3000/api';
  queryClient.setQueryDefaults(authKeys.me, { gcTime: Infinity });
  apiClient.defaults.adapter = defaultAdapter;
});
afterEach(async () => {
  await cleanup();
  await signOut();
  queryClient.clear();
  jest.restoreAllMocks();
});

test('a new install has an empty session and opens login without fetching protected data', async () => {
  await openApp();
  await screen.findByRole('button', { name: 'Đăng nhập' });
  expect(calls).toEqual([]);
  expect(screen.queryByText(originalUser.fullName)).toBeNull();
});
test.each(allRoles)('login preserves the backend role %s in the account screen', async (role) => {
  serverUser = { ...originalUser, role };
  await enterAccount();
  expect(screen.getByText(roleLabels[role])).toBeTruthy();
  expect(useSession.getState().user?.role).toBe(role);
});
test('foreground me refresh updates profile data without ending a valid session', async () => {
  await enterAccount();
  await act(async () => focusManager.setFocused(false));
  serverUser = { ...serverUser, fullName: 'Tên đã cập nhật' };
  await act(async () => focusManager.setFocused(true));
  await screen.findByText('Tên đã cập nhật');
  expect(useSession.getState().user?.fullName).toBe('Tên đã cập nhật');
  expect(useSession.getState().status).toBe('authenticated');
});
test('offline foreground refresh shows a retryable error without inventing an expired session', async () => {
  await enterAccount();
  await act(async () => focusManager.setFocused(false));
  apiClient.defaults.adapter = async (config) => {
    throw new AxiosError('Offline', 'ERR_NETWORK', config);
  };
  await act(async () => focusManager.setFocused(true));
  await screen.findByText('Không kết nối được máy chủ. Kiểm tra mạng và địa chỉ API.');
  expect(screen.getByText(originalUser.fullName)).toBeTruthy();
  expect(useSession.getState().status).toBe('authenticated');
});
test('invalid form input never calls login', async () => {
  await openApp();
  await fillLogin('invalid', '');
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByText('Email không hợp lệ')).toBeTruthy();
  expect(screen.getByText('Nhập mật khẩu')).toBeTruthy();
  expect(calls).toEqual([]);
});
test('UI login normalizes email, preserves password, persists the token and shares me across subscribers', async () => {
  apiClient.defaults.adapter = async (config) => {
    if (config.url === '/auth/login')
      expect(JSON.parse(config.data)).toEqual({
        email: 'staff@example.com',
        password: '  test-password  ',
      });
    return defaultAdapter(config);
  };
  await openApp();
  await fillLogin(' STAFF@EXAMPLE.COM ', '  test-password  ');
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByText(originalUser.fullName)).toBeTruthy();
  expect(storedToken).toBe('test-access-token');
  expect(screen.getByText('Chưa cập nhật')).toBeTruthy();
  expect(calls).toEqual(['post /auth/login']);
  expect(queryClient.getQueryData(authKeys.me)).toEqual(originalUser);
});
test('login error stays on login, clears the password and releases sensitive mutation variables', async () => {
  apiClient.defaults.adapter = async (config) => reject(config, 401, 'Sai thông tin đăng nhập.');
  await openApp();
  await fillLogin();
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByText('Sai thông tin đăng nhập.')).toBeTruthy();
  expect(screen.getByLabelText('Mật khẩu').props.value).toBe('');
  expect(storedToken).toBeNull();
  expect(useSession.getState().status).toBe('guest');
  await waitFor(() =>
    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some((mutation) => mutation.state.variables !== undefined),
    ).toBe(false),
  );
});
test('pending login disables input and duplicate submission', async () => {
  let complete!: () => void;
  apiClient.defaults.adapter = (config) =>
    new Promise((resolve) => {
      calls.push('login');
      complete = () => resolve(ok(config, { user: serverUser, token: 'test-access-token' }));
    });
  await openApp();
  await fillLogin();
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(screen.getByRole('button', { name: 'Đăng nhập' }).props.accessibilityState.busy).toBe(
    true,
  );
  expect(screen.getByLabelText('Email').props.editable).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(calls).toHaveLength(1);
  await act(async () => complete());
  await screen.findByText(originalUser.fullName);
});
test('restoration keeps login and account hidden until me validates the stored token', async () => {
  let complete!: () => void;
  apiClient.defaults.adapter = (config) =>
    new Promise((resolve) => {
      calls.push(`${config.method} ${config.url}`);
      expect(config.headers.Authorization).toBe('Bearer stored-token');
      complete = () => resolve(ok(config, { user: serverUser }));
    });
  await openApp('stored-token');
  expect(screen.getByText('Đang kiểm tra phiên đăng nhập…')).toBeTruthy();
  expect(screen.queryByLabelText('Email')).toBeNull();
  expect(screen.queryByText(originalUser.fullName)).toBeNull();
  await waitFor(() => expect(calls).toHaveLength(1));
  await act(async () => complete());
  await screen.findByText(originalUser.fullName);
  expect(calls).toEqual(['get /auth/me']);
});
test('offline restoration shows retry and does not discard a recoverable token', async () => {
  apiClient.defaults.adapter = async (config) => {
    throw new AxiosError('Offline', 'ERR_NETWORK', config);
  };
  await openApp('stored-token');
  await screen.findByText('Không thể kiểm tra phiên');
  expect(screen.queryByText(originalUser.fullName)).toBeNull();
  expect(storedToken).toBe('stored-token');
  apiClient.defaults.adapter = defaultAdapter;
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  await screen.findByText(originalUser.fullName);
});
test('expired token is deleted and login explains why reauthentication is required', async () => {
  apiClient.defaults.adapter = async (config) => reject(config, 401, 'Token has expired.');
  await openApp('expired-token');
  expect(
    await screen.findByText('Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.'),
  ).toBeTruthy();
  expect(storedToken).toBeNull();
  expect(screen.queryByText(originalUser.fullName)).toBeNull();
});
test('malformed me response is an explicit error, never an authenticated or empty account', async () => {
  apiClient.defaults.adapter = async (config) => ok(config, { user: null });
  await openApp('stored-token');
  expect(
    await screen.findByText(
      'Phản hồi xác thực không hợp lệ. Vui lòng thử lại hoặc liên hệ quản lý.',
    ),
  ).toBeTruthy();
  expect(useSession.getState().status).toBe('restore-error');
});
test('storage deletion failure blocks protected UI until retry succeeds', async () => {
  await enterAccount();
  jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('Storage locked'));
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.style === 'destructive')?.onPress?.();
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng xuất' }));
  await screen.findByText('Chưa xóa được phiên đã lưu');
  expect(screen.queryByText(originalUser.fullName)).toBeNull();
  expect(screen.queryByLabelText('Email')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  await screen.findByRole('button', { name: 'Đăng nhập' });
  expect(storedToken).toBeNull();
});
test('foreground revalidation detects changed permissions and ends the old session', async () => {
  await enterAccount();
  await act(async () => focusManager.setFocused(false));
  serverUser = { ...serverUser, role: 'club_manager' };
  await act(async () => focusManager.setFocused(true));
  expect(
    await screen.findByText('Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.'),
  ).toBeTruthy();
  expect(storedToken).toBeNull();
  expect(calls).toContain('get /auth/me');
});
test('password confirmation validation stops an invalid request', async () => {
  await enterAccount();
  await fillPassword('different-password');
  await fireEvent.press(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
  expect(await screen.findByText('Xác nhận mật khẩu không khớp')).toBeTruthy();
  expect(calls).not.toContain('post /auth/change-password');
});
test('wrong current password keeps the session and clears all password fields', async () => {
  await enterAccount();
  apiClient.defaults.adapter = async (config) =>
    config.url === '/auth/change-password'
      ? reject(config, 403, 'Mật khẩu hiện tại không đúng.')
      : defaultAdapter(config);
  await fillPassword();
  await fireEvent.press(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
  await screen.findByText('Mật khẩu hiện tại không đúng.');
  expect(useSession.getState().status).toBe('authenticated');
  expect(screen.getByLabelText('Mật khẩu hiện tại').props.value).toBe('');
  expect(screen.getByLabelText('Mật khẩu mới').props.value).toBe('');
  expect(screen.getByLabelText('Xác nhận mật khẩu mới').props.value).toBe('');
  await waitFor(() =>
    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some((mutation) => mutation.state.variables !== undefined),
    ).toBe(false),
  );
});
test('successful password change clears the account cache/token and returns to login with a notice', async () => {
  await enterAccount();
  queryClient.setQueryData(['horses'], ['private']);
  await fillPassword();
  await fireEvent.press(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
  await screen.findByText('Đã đổi mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.');
  expect(storedToken).toBeNull();
  expect(queryClient.getQueryData(['horses'])).toBeUndefined();
});
test('a late password response from a previous session cannot log out another account', async () => {
  await enterAccount();
  let complete!: () => void;
  apiClient.defaults.adapter = (config) =>
    config.url === '/auth/change-password'
      ? new Promise((resolve) => {
          complete = () => resolve(ok(config, { changed: true, loginRequired: true }));
        })
      : defaultAdapter(config);
  await fillPassword();
  await fireEvent.press(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
  await waitFor(() => expect(complete).toBeDefined());
  await act(async () => {
    await signOut();
    serverUser = { ...originalUser, _id: 'b'.repeat(24), fullName: 'Tài khoản thứ hai' };
    await signIn({ email: serverUser.email, password: 'another-test-password' });
  });
  await screen.findByText('Tài khoản thứ hai');
  await act(async () => complete());
  expect(useSession.getState().status).toBe('authenticated');
  expect(useSession.getState().user?._id).toBe('b'.repeat(24));
});
