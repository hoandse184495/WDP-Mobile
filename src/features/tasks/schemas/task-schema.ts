import { z } from 'zod';
export const measurementsSchema = z
  .object({
    distanceCompleted: z.number().positive(),
    durationMinutes: z.number().positive(),
    maxSpeed: z.number().positive(),
    avgHeartRate: z.number().positive().max(250),
    maxHeartRate: z.number().positive().max(250),
  })
  .refine((value) => value.avgHeartRate <= value.maxHeartRate, {
    path: ['avgHeartRate'],
    message: 'Nhịp tim trung bình không được vượt tối đa.',
  });
export const finishSchema = z.object({
  notes: z.string().trim().max(1000),
  measurements: measurementsSchema.optional(),
  feedingOutcome: z.enum(['normal', 'partial', 'refused', 'not_fed']).optional(),
  autoCompleteCheckpoints: z.boolean().optional(),
  acknowledgeRationChange: z.boolean().optional(),
  notIssuedReason: z.string().trim().min(3).max(1000).optional(),
  feedingLeftovers: z
    .array(
      z.object({
        itemId: z.string(),
        quantity: z.number().min(0).max(1000000).nullable(),
        measurement: z.enum(['weighed', 'estimated', 'unknown']),
        disposition: z.enum(['none', 'discarded', 'pending_review']),
      }),
    )
    .optional(),
});
export type FinishInput = z.infer<typeof finishSchema>;
export const cancelSchema = z.object({
  reason: z.string().trim().min(3, 'Cần ít nhất 3 ký tự').max(1000),
});

export const startSchema = z.object({
  scenario: z.enum(['normal', 'heart_rate', 'speed', 'both']).optional(),
});
export type StartInput = z.infer<typeof startSchema>;
