import { create, isAxiosError } from 'axios';
import { environment, validateApiUrl } from '@/core/config/environment';
import { AppError, toAppError } from '@/core/errors/app-error';

// The coordinator owns session state. Networking depends only on this small interface.
let accessToken: string | null = null;
let unauthorized: () => void = () => {};
export const setApiToken = (token: string | null) => {
  accessToken = token;
};
export const getApiToken = () => accessToken;
export const rejectApiSession = (expectedToken: string) => {
  if (accessToken === expectedToken) unauthorized();
};
export const onUnauthorized = (handler: () => void) => {
  unauthorized = handler;
};

export const apiClient = create({ timeout: 20000, headers: { Accept: 'application/json' } });
apiClient.interceptors.request.use((config) => {
  config.baseURL = validateApiUrl(environment.apiUrl, __DEV__ ? environment.name : 'production');
  if (accessToken && !config.url?.startsWith('/auth/login'))
    config.headers.Authorization = `Bearer ${accessToken}`;
  // Remember which session sent the request. A late 401 must not sign out a new login.
  return config;
});
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config?.url !== '/auth/login'
    ) {
      const sent = error.config?.headers?.Authorization;
      if (accessToken && sent === `Bearer ${accessToken}`) unauthorized();
    }
    // Do not log bodies, headers, signed URLs, email addresses, passwords, or tokens.
    return Promise.reject(toAppError(error));
  },
);

export async function requestData<T = Record<string, unknown>>(
  request: Promise<{ data: unknown }>,
): Promise<T> {
  const { data } = await request;
  if (
    !data ||
    typeof data !== 'object' ||
    !('success' in data) ||
    data.success !== true ||
    !('data' in data)
  ) {
    throw new AppError('Phản hồi API không đúng định dạng.');
  }
  return data.data as T;
}
