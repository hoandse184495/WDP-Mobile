import { authApi } from '@/features/auth/api/auth-api';
import { tokenStorage } from '@/core/storage/token-storage';
import { useSession } from '@/features/auth/stores/session-store';
import { restoreSession, signIn, signOut } from '@/features/auth/utils/session';
import { queryClient } from '@/core/network/query-client';
import { authKeys } from '@/features/auth/api/auth-keys';
import { waitFor } from '@testing-library/react-native';
jest.mock('@/features/auth/api/auth-api', () => ({ authApi: { login: jest.fn(), me: jest.fn() } }));
const user = {
  _id: 'u1',
  fullName: 'Staff',
  email: 'staff@example.com',
  role: 'groom' as const,
  isActive: true,
};
beforeEach(async () => {
  queryClient.setQueryDefaults(authKeys.me, { gcTime: Infinity });
  await signOut();
  jest.clearAllMocks();
});

test('no stored token goes directly to login without calling me', async () => {
  jest.spyOn(tokenStorage, 'read').mockResolvedValueOnce(null);
  await restoreSession();
  expect(authApi.me).not.toHaveBeenCalled();
  expect(useSession.getState().status).toBe('guest');
});
test('a storage read error blocks authenticated routes and can be retried', async () => {
  jest.spyOn(tokenStorage, 'read').mockRejectedValueOnce(new Error('Keychain unavailable'));
  await restoreSession();
  expect(useSession.getState().status).toBe('restore-error');
  expect(authApi.me).not.toHaveBeenCalled();
  jest.spyOn(tokenStorage, 'read').mockResolvedValueOnce(null);
  await restoreSession();
  expect(useSession.getState().status).toBe('guest');
});
test('successful login persists the token and seeds the shared current-user query', async () => {
  jest.mocked(authApi.login).mockResolvedValueOnce({ user, token: 'session-token' });
  const write = jest.spyOn(tokenStorage, 'write');
  await signIn({ email: user.email, password: 'private-password' });
  expect(write).toHaveBeenCalledWith('session-token');
  expect(queryClient.getQueryData(authKeys.me)).toEqual(user);
  expect(useSession.getState().status).toBe('authenticated');
});
test('cannot authenticate when SecureStore rejects the token write', async () => {
  jest.mocked(authApi.login).mockResolvedValueOnce({ user, token: 'session-token' });
  jest.spyOn(tokenStorage, 'write').mockRejectedValueOnce(new Error('Storage full'));
  const clear = jest.spyOn(tokenStorage, 'clear');
  await expect(signIn({ email: user.email, password: 'private-password' })).rejects.toThrow(
    'Không thể lưu phiên',
  );
  expect(clear).toHaveBeenCalled();
  expect(useSession.getState().status).toBe('guest');
  expect(queryClient.getQueryData(authKeys.me)).toBeUndefined();
});
test('failed deletion locks the session until storage cleanup succeeds', async () => {
  jest.spyOn(tokenStorage, 'clear').mockRejectedValueOnce(new Error('Keychain locked'));
  queryClient.setQueryData(['horses'], ['private']);
  await signOut();
  expect(useSession.getState().status).toBe('signout-error');
  expect(useSession.getState().user).toBeNull();
  expect(queryClient.getQueryData(['horses'])).toBeUndefined();
  await signOut();
  expect(useSession.getState().status).toBe('guest');
});
test('late login response cannot sign a logged-out user back in', async () => {
  let resolveLogin!: (value: { user: typeof user; token: string }) => void;
  jest.mocked(authApi.login).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
  );
  const write = jest.spyOn(tokenStorage, 'write');
  const login = signIn({ email: user.email, password: 'private-password' });
  await signOut();
  resolveLogin({ user, token: 'obsolete-token' });
  await login;
  expect(write).not.toHaveBeenCalled();
  expect(useSession.getState().status).toBe('guest');
});
test('sign-out during a token write clears the completed write before returning to login', async () => {
  let finishWrite!: () => void;
  jest.mocked(authApi.login).mockResolvedValueOnce({ user, token: 'obsolete-token' });
  const write = jest.spyOn(tokenStorage, 'write').mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishWrite = resolve;
      }),
  );
  const login = signIn({ email: user.email, password: 'private-password' });
  await waitFor(() => expect(write).toHaveBeenCalled());
  const logout = signOut();
  expect(useSession.getState().status).toBe('signing-out');
  finishWrite();
  await Promise.all([login, logout]);
  expect(useSession.getState().status).toBe('guest');
});
test('an older sign-out cannot delete the new token after slow query cancellation', async () => {
  let finishCancellation!: () => void;
  const cancel = jest.spyOn(queryClient, 'cancelQueries').mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishCancellation = resolve;
      }),
  );
  const clear = jest.spyOn(tokenStorage, 'clear');
  const write = jest.spyOn(tokenStorage, 'write');
  const logout = signOut();
  jest.mocked(authApi.login).mockResolvedValueOnce({ user, token: 'new-token' });
  await signIn({ email: user.email, password: 'private-password' });
  finishCancellation();
  await logout;
  expect(useSession.getState().status).toBe('authenticated');
  expect(clear.mock.invocationCallOrder.at(-1)!).toBeLessThan(
    write.mock.invocationCallOrder.at(-1)!,
  );
  expect(queryClient.getQueryData(authKeys.me)).toEqual(user);
  cancel.mockRestore();
});
afterEach(() => queryClient.clear());
test('restores only after me validates the stored token', async () => {
  jest.spyOn(tokenStorage, 'read').mockResolvedValueOnce('stored-token');
  jest.mocked(authApi.me).mockResolvedValueOnce(user);
  await restoreSession();
  expect(useSession.getState().user).toEqual(user);
  expect(authApi.me).toHaveBeenCalledTimes(1);
});
test('a failed login never creates an authenticated session', async () => {
  jest.mocked(authApi.login).mockRejectedValueOnce(new Error('Invalid credentials'));
  await expect(signIn({ email: user.email, password: 'bad' })).rejects.toThrow();
  expect(useSession.getState().status).toBe('guest');
});
test('logout removes token and all account-scoped cached data', async () => {
  queryClient.setQueryData(['horses'], ['private']);
  const clear = jest.spyOn(tokenStorage, 'clear');
  await signOut();
  expect(clear).toHaveBeenCalled();
  expect(queryClient.getQueryData(['horses'])).toBeUndefined();
  expect(useSession.getState().user).toBeNull();
});
test('network failure during restore preserves recoverable error state', async () => {
  jest.spyOn(tokenStorage, 'read').mockResolvedValueOnce('stored-token');
  jest.mocked(authApi.me).mockRejectedValueOnce(new Error('Offline'));
  await restoreSession();
  expect(useSession.getState().status).toBe('restore-error');
  expect(useSession.getState().user).toBeNull();
});
test('late restoration cannot resurrect a signed-out user', async () => {
  let resolveMe!: (value: typeof user) => void;
  jest.spyOn(tokenStorage, 'read').mockResolvedValueOnce('stored-token');
  jest.mocked(authApi.me).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveMe = resolve;
      }),
  );
  const restore = restoreSession();
  for (let i = 0; i < 10 && !resolveMe; i++) await Promise.resolve();
  await signOut();
  resolveMe(user);
  await restore;
  expect(useSession.getState().status).toBe('guest');
});
