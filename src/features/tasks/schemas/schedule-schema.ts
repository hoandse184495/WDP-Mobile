import { z } from 'zod';
import { objectId } from '@/shared/types/api';
export const scheduleSchema = z
  .object({
    title: z.string().trim().min(1, 'Nhập tiêu đề').max(150),
    type: z.enum(['feeding', 'bathing', 'stall_cleaning', 'hoof_care', 'training']),
    horseId: z.string(),
    stallId: z.string(),
    groomId: objectId,
    trainingPlanId: z.string(),
    trainingExerciseKey: z.string(),
    rationPlanId: z.string(),
    rationMealKey: z.string(),
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Dùng YYYY-MM-DDTHH:mm'),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Dùng YYYY-MM-DDTHH:mm'),
    instructions: z.string().trim().max(2000),
  })
  .superRefine((input, ctx) => {
    const validLocal = (value: string) => {
      const parsed = new Date(`${value}:00Z`);
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 16) === value;
    };
    const start = Date.parse(`${input.start}:00+07:00`),
      end = Date.parse(`${input.end}:00+07:00`);
    if (
      !validLocal(input.start) ||
      !validLocal(input.end) ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start
    )
      ctx.addIssue({ code: 'custom', path: ['end'], message: 'Giờ kết thúc phải sau giờ bắt đầu' });
    if (
      input.type === 'stall_cleaning'
        ? !objectId.safeParse(input.stallId).success
        : !objectId.safeParse(input.horseId).success
    )
      ctx.addIssue({
        code: 'custom',
        path: ['horseId'],
        message: 'Chọn ngựa hoặc ô chuồng phù hợp',
      });
    if (
      input.type === 'training' &&
      (!objectId.safeParse(input.trainingPlanId).success || !input.trainingExerciseKey)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['trainingPlanId'],
        message: 'Chọn giáo án và bài tập',
      });
    if (
      input.type === 'feeding' &&
      (!objectId.safeParse(input.rationPlanId).success || !input.rationMealKey)
    )
      ctx.addIssue({ code: 'custom', path: ['rationPlanId'], message: 'Chọn khẩu phần và bữa ăn' });
  });
export type ScheduleInput = z.infer<typeof scheduleSchema>;
