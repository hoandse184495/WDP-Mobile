import { z } from 'zod';
import { utf8Length } from '@/core/utils/utf8';
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Email không hợp lệ')),
  password: z.string().min(1, 'Nhập mật khẩu'),
});
export type LoginInput = z.infer<typeof loginSchema>;
export const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Nhập mật khẩu hiện tại')
      .max(256, 'Mật khẩu hiện tại tối đa 256 ký tự'),
    newPassword: z
      .string()
      .min(12, 'Cần ít nhất 12 ký tự')
      .refine((value) => utf8Length(value) <= 72, 'Tối đa 72 byte UTF-8'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Xác nhận mật khẩu không khớp',
  });
export type PasswordInput = z.infer<typeof passwordSchema>;
