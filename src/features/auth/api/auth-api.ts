import { z } from 'zod';
import { apiClient, requestData } from '@/core/network/api-client';
import { AppError } from '@/core/errors/app-error';
import { LoginInput, PasswordInput } from '../schemas/auth-schema';
import { loginResponseSchema, userSchema } from '../types/auth';
function parseAuthResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new AppError('Phản hồi xác thực không hợp lệ. Vui lòng thử lại hoặc liên hệ quản lý.');
  return result.data;
}
export const authApi = {
  login: async (input: LoginInput) =>
    parseAuthResponse(loginResponseSchema, await requestData(apiClient.post('/auth/login', input))),
  me: async (signal?: AbortSignal) =>
    parseAuthResponse(
      z.object({ user: userSchema }),
      await requestData(apiClient.get('/auth/me', { signal })),
    ).user,
  changePassword: async (input: PasswordInput) => {
    parseAuthResponse(
      z.object({ changed: z.literal(true), loginRequired: z.literal(true) }),
      await requestData(apiClient.post('/auth/change-password', input)),
    );
  },
};
