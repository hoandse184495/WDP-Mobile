import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { apiClient, onUnauthorized, setApiToken } from '@/core/network/api-client';
import { environment } from '@/core/config/environment';
import { authApi } from '@/features/auth/api/auth-api';
const user = {
  _id: 'a'.repeat(24),
  fullName: 'Test user',
  email: 'user@example.com',
  role: 'groom',
  isActive: true,
};
const response = (config: InternalAxiosRequestConfig, data: unknown) => ({
  config,
  status: 200,
  statusText: 'OK',
  headers: {},
  data: { success: true, data },
});
beforeEach(() => {
  environment.apiUrl = 'http://10.0.2.2:3000/api';
  setApiToken(null);
  onUnauthorized(() => {});
});
afterEach(() => setApiToken(null));

test('login uses the existing endpoint and envelope without an Authorization header', async () => {
  setApiToken('previous-token');
  apiClient.defaults.adapter = async (config) => {
    expect(config.method).toBe('post');
    expect(config.url).toBe('/auth/login');
    expect(config.headers.Authorization).toBeUndefined();
    expect(JSON.parse(config.data)).toEqual({
      email: user.email,
      password: '  private-password  ',
    });
    return response(config, { user, token: 'access-token' });
  };
  await expect(
    authApi.login({ email: user.email, password: '  private-password  ' }),
  ).resolves.toEqual({ user, token: 'access-token' });
});
test('me uses the current bearer token and accepts a cancellation signal', async () => {
  setApiToken('access-token');
  const signal = new AbortController().signal;
  apiClient.defaults.adapter = async (config) => {
    expect(config.url).toBe('/auth/me');
    expect(config.method).toBe('get');
    expect(config.headers.Authorization).toBe('Bearer access-token');
    expect(config.signal).toBe(signal);
    return response(config, { user });
  };
  await expect(authApi.me(signal)).resolves.toEqual(user);
});
test.each([
  null,
  {},
  { user: null },
  { user: { ...user, role: 'unknown_role' } },
  { user: { ...user, isActive: false } },
])('invalid current-user responses are explicit failures: %j', async (body) => {
  apiClient.defaults.adapter = async (config) => response(config, body);
  await expect(authApi.me()).rejects.toThrow('Phản hồi xác thực không hợp lệ');
});
test('login with an empty token cannot authenticate', async () => {
  apiClient.defaults.adapter = async (config) => response(config, { user, token: '' });
  await expect(authApi.login({ email: user.email, password: 'private-password' })).rejects.toThrow(
    'Phản hồi xác thực không hợp lệ',
  );
});
test('password change sends the verified backend shape and checks loginRequired', async () => {
  const input = {
    currentPassword: 'old-password',
    newPassword: 'new-password-2026',
    confirmPassword: 'new-password-2026',
  };
  apiClient.defaults.adapter = async (config) => {
    expect(config.url).toBe('/auth/change-password');
    expect(config.method).toBe('post');
    expect(JSON.parse(config.data)).toEqual(input);
    return response(config, { changed: true, loginRequired: true });
  };
  await expect(authApi.changePassword(input)).resolves.toBeUndefined();
  apiClient.defaults.adapter = async (config) =>
    response(config, { changed: false, loginRequired: false });
  await expect(authApi.changePassword(input)).rejects.toThrow('Phản hồi xác thực không hợp lệ');
});
test.each([400, 401, 403, 429, 500])(
  'backend error %s remains a failure without faking a session',
  async (status) => {
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, {
        config,
        status,
        statusText: '',
        headers: {},
        data: { success: false, message: 'Backend rejected this request.' },
      });
    };
    await expect(
      authApi.login({ email: user.email, password: 'private-password' }),
    ).rejects.toMatchObject({ status, message: 'Backend rejected this request.' });
  },
);
