import { z } from 'zod';
import { referenceSchema } from '@/shared/types/api';
export const taskSchema = z.object({
  _id: z.string(),
  title: z.string(),
  type: z.enum([
    'feeding',
    'bathing',
    'stall_cleaning',
    'hoof_care',
    'training',
    'medical_support',
  ]),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
  revision: z.number().int(),
  scheduledStartAt: z.string(),
  scheduledEndAt: z.string(),
  actualStartAt: z.string().nullable().optional(),
  actualEndAt: z.string().nullable().optional(),
  horseId: referenceSchema,
  groomId: referenceSchema,
  stallId: referenceSchema,
  medicalScheduleId: referenceSchema,
  medicalSupport: z
    .object({
      arrivedAt: z.string().nullable().optional(),
      returnedAt: z.string().nullable().optional(),
    })
    .passthrough()
    .nullish(),
  instructions: z.string(),
  completionNotes: z.string().optional(),
  feedingOutcome: z.enum(['normal', 'partial', 'refused', 'not_fed']).nullish(),
  acknowledgedRationChange: z.boolean().optional(),
  blockedReason: z.string().optional(),
  startBlockedReason: z.string().optional(),
  feedingStockRequired: z.boolean().optional(),
  feedingReviewRequired: z.boolean().optional(),
  trainingSnapshot: z
    .object({
      title: z.string().optional(),
      instructions: z.string().optional(),
      distance: z.number().optional(),
      targetSpeedMax: z.number().optional(),
      targetHeartRateMax: z.number().optional(),
    })
    .passthrough()
    .nullable()
    .optional(),
  feedingSnapshot: z
    .object({
      meal: z.object({
        name: z.string(),
        lines: z.array(z.object({ name: z.string(), quantity: z.number(), unit: z.string() })),
      }),
    })
    .passthrough()
    .nullable()
    .optional(),
});
export type Task = z.infer<typeof taskSchema>;
export const statusLabels = {
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};
export const typeLabels = {
  feeding: 'Cho ăn',
  bathing: 'Tắm ngựa',
  stall_cleaning: 'Vệ sinh chuồng',
  hoof_care: 'Chăm sóc móng',
  training: 'Huấn luyện',
  medical_support: 'Hỗ trợ khám và đưa ngựa về',
};
export const evidenceSchema = z.object({
  taskId: z.string(),
  revision: z.number().int(),
  status: z.string(),
  photos: z.array(z.object({ _id: z.string(), fileName: z.string(), uploadedAt: z.string() })),
});
export const feedingPreviewSchema = z.object({
  canIssue: z.boolean(),
  blockedReason: z.string(),
  previewHash: z.string().nullable().optional(),
  warehouse: z.object({ name: z.string() }).nullable().optional(),
  requirements: z.array(
    z.object({
      itemId: z.string(),
      name: z.string(),
      unit: z.string(),
      required: z.number(),
      available: z.number(),
      shortage: z.number(),
    }),
  ),
  lines: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
      expiresOn: z.string().nullable(),
    }),
  ),
  issue: z
    .object({
      number: z.string(),
      lines: z.array(
        z.object({ itemId: z.string(), name: z.string(), unit: z.string(), quantity: z.number() }),
      ),
    })
    .nullable(),
});
export type FeedingPreview = z.infer<typeof feedingPreviewSchema>;

export const feedingOutcomeLabels = {
  normal: 'Ăn bình thường',
  partial: 'Ăn ít',
  refused: 'Bỏ ăn',
  not_fed: 'Không cho ăn',
} as const;
