import { onUnauthorized, setApiToken } from '@/core/network/api-client';
import { queryClient } from '@/core/network/query-client';
import { tokenStorage } from '@/core/storage/token-storage';
import { AppError, toAppError } from '@/core/errors/app-error';
import { authApi } from '../api/auth-api';
import { authKeys } from '../api/auth-keys';
import { LoginInput } from '../schemas/auth-schema';
import { useSession } from '../stores/session-store';

let epoch = 0;
let storageQueue: Promise<unknown> = Promise.resolve();
const persist = <T>(work: () => Promise<T>): Promise<T> => {
  const next = storageQueue.catch(() => undefined).then(work);
  storageQueue = next;
  return next;
};
export const sessionVersion = () => epoch;
export type SignOutReason = 'manual' | 'expired' | 'password-changed';
const notices: Record<SignOutReason, string | null> = {
  manual: null,
  expired: 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.',
  'password-changed': 'Đã đổi mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.',
};

export async function signOut(reason: SignOutReason = 'manual') {
  const current = ++epoch;
  setApiToken(null);
  useSession.setState({ status: 'signing-out', user: null, error: null, notice: notices[reason] });
  // Queue deletion immediately. An older sign-out must never delete a newer login.
  const deletion = persist(tokenStorage.clear);
  const cancellation = queryClient.cancelQueries();
  queryClient.clear();
  try {
    await Promise.all([deletion, cancellation]);
    if (current === epoch) useSession.setState({ status: 'guest' });
  } catch {
    if (current === epoch)
      useSession.setState({
        status: 'signout-error',
        error: new AppError(
          'Chưa thể xóa phiên đã lưu trên thiết bị. Vui lòng thử lại trước khi tiếp tục.',
        ),
      });
  }
}
onUnauthorized(() => {
  void signOut('expired');
});

export async function restoreSession() {
  const current = ++epoch;
  setApiToken(null);
  useSession.setState({ status: 'restoring', error: null, user: null, notice: null });
  void queryClient.cancelQueries();
  queryClient.clear();
  try {
    const token = await persist(tokenStorage.read);
    if (current !== epoch) return;
    if (!token) {
      useSession.setState({ status: 'guest' });
      return;
    }
    setApiToken(token);
    const user = await queryClient.fetchQuery({
      queryKey: authKeys.me,
      queryFn: ({ signal }) => authApi.me(signal),
      staleTime: 0,
      retry: false,
    });
    if (current === epoch) useSession.setState({ status: 'authenticated', user });
  } catch (error) {
    if (current === epoch) {
      setApiToken(null);
      useSession.setState({ status: 'restore-error', error: toAppError(error) });
    }
  }
}

export async function signIn(input: LoginInput) {
  const current = ++epoch;
  const session = await authApi.login(input);
  if (current !== epoch) return;
  try {
    await persist(async () => {
      if (current === epoch) await tokenStorage.write(session.token);
    });
  } catch (error) {
    if (current === epoch) {
      await signOut();
      throw new AppError('Không thể lưu phiên đăng nhập an toàn trên thiết bị. Vui lòng thử lại.');
    }
    throw error;
  }
  if (current !== epoch) return;
  queryClient.clear();
  queryClient.setQueryData(authKeys.me, session.user);
  setApiToken(session.token);
  useSession.setState({ status: 'authenticated', user: session.user, error: null, notice: null });
}
