import { isAxiosError } from 'axios';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError)
    return new AppError(
      'Dữ liệu máy chủ chưa đúng định dạng. Vui lòng tải lại hoặc liên hệ quản lý.',
    );
  if (isAxiosError(error)) {
    const body: unknown = error.response?.data;
    const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const details = Array.isArray(data.errors)
      ? data.errors.filter((item): item is string => typeof item === 'string')
      : [];
    const message = details.length
      ? details.join('\n')
      : typeof data.message === 'string'
        ? data.message
        : undefined;
    return new AppError(
      message ??
        (error.code === 'ECONNABORTED'
          ? 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.'
          : error.response
            ? 'Yêu cầu không thành công. Vui lòng thử lại.'
            : 'Không kết nối được máy chủ. Kiểm tra mạng và địa chỉ API.'),
      error.response?.status,
    );
  }
  return new AppError(error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.');
}
