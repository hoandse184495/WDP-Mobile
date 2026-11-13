import { z } from 'zod';
import { objectId } from '@/shared/types/api';
export const incidentSchema = z
  .object({
    title: z.string().trim().min(3, 'Cần ít nhất 3 ký tự').max(150),
    category: z.enum(['not_eating', 'unusual_behavior', 'hoof_issue', 'stall_damage', 'other']),
    priority: z.enum(['normal', 'urgent']),
    observedAt: z
      .string()
      .datetime({ offset: true })
      .refine((value) => Date.parse(value) <= Date.now(), 'Không chọn thời điểm tương lai'),
    description: z.string().trim().min(5, 'Cần mô tả ít nhất 5 ký tự').max(2000),
    horseId: objectId.optional(),
    stallId: objectId.optional(),
    requestKey: z.uuid(),
  })
  .refine((value) => Boolean(value.horseId) !== Boolean(value.stallId), {
    path: ['horseId'],
    message: 'Chọn một ngựa hoặc một ô chuồng',
  });
export type IncidentInput = z.infer<typeof incidentSchema>;
