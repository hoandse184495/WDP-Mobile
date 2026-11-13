import { z } from 'zod';
import { objectId } from '@/shared/types/api';
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Dùng YYYY-MM-DD')
  .refine(
    (value) =>
      Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
    'Ngày không hợp lệ',
  );
export const exerciseSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z][a-z0-9_-]{0,63}$/, 'Mã bắt đầu bằng chữ thường, chỉ dùng a-z, số, _ hoặc -'),
  title: z.string().trim().min(1).max(150),
  distance: z.number().finite().min(100),
  surface: z.enum(['dirt', 'turf', 'synthetic']),
  workloadLevel: z.enum(['light', 'moderate', 'intense', 'maximum']),
  targetHeartRateMax: z.number().finite().min(60).max(250),
  targetSpeedMax: z.number().finite().min(5).max(30),
  instructions: z.string().trim().max(2000),
});
export const trainingSchema = z
  .object({
    title: z.string().trim().min(1, 'Nhập tên giáo án'),
    horseId: objectId,
    phase: z.enum(['build_up', 'sprint', 'endurance', 'recovery', 'pre_race']),
    startDate: day,
    endDate: day,
    description: z.string(),
    instructions: z.string(),
    exercises: z
      .array(exerciseSchema)
      .min(1)
      .max(20)
      .refine(
        (rows) => new Set(rows.map((row) => row.key)).size === rows.length,
        'Mã bài tập phải khác nhau',
      ),
  })
  .refine((plan) => plan.startDate <= plan.endDate, {
    path: ['endDate'],
    message: 'Ngày kết thúc phải từ ngày bắt đầu trở đi',
  });
export type TrainingInput = z.infer<typeof trainingSchema>;
export const reviewSchema = z.object({
  performanceRating: z.number().min(1).max(5),
  trainerNotes: z.string().trim().max(4000),
  fitnessScore: z.number().finite().min(0).max(100).optional(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;
