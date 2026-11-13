import { z } from 'zod';
import { objectId } from '@/shared/types/api';
export const horseInputSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên ngựa'),
  registrationCode: z.string().trim().min(1, 'Nhập mã đăng ký'),
  breed: z.string().trim().min(1, 'Nhập giống'),
  gender: z.enum(['colt', 'filly', 'stallion', 'mare', 'gelding']),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Dùng YYYY-MM-DD')
    .refine(
      (value) =>
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value &&
        Date.parse(value) <= Date.now(),
      'Ngày sinh không hợp lệ',
    ),
  ownerId: objectId,
  stallId: z.union([objectId, z.literal('')]).optional(),
  trainerId: z.union([objectId, z.literal('')]).optional(),
  groomId: z.union([objectId, z.literal('')]).optional(),
  vetId: z.union([objectId, z.literal('')]).optional(),
  color: z.string(),
  notes: z.string(),
});
export type HorseInput = z.infer<typeof horseInputSchema>;
export const horseEditSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên ngựa'),
  breed: z.string().trim().min(1, 'Nhập giống'),
  notes: z.string(),
  currentWeight: z
    .string()
    .refine((v) => !v || (Number.isFinite(Number(v)) && Number(v) > 0), 'Cân nặng phải lớn hơn 0'),
  height: z
    .string()
    .refine((v) => !v || (Number.isFinite(Number(v)) && Number(v) > 0), 'Chiều cao phải lớn hơn 0'),
  fitnessScore: z
    .string()
    .refine(
      (v) => v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100,
      'Thể lực từ 0 đến 100',
    ),
});
export type HorseEdit = z.infer<typeof horseEditSchema>;
