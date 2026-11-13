import { z } from 'zod';
import { referenceSchema } from '@/shared/types/api';
export const horseSchema = z.object({
  _id: z.string(),
  name: z.string(),
  registrationCode: z.string(),
  breed: z.string(),
  gender: z.string(),
  dateOfBirth: z.string(),
  color: z.string().nullable().optional(),
  ownerId: referenceSchema,
  trainerId: referenceSchema,
  groom: referenceSchema,
  currentWeight: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  fitnessScore: z.number(),
  healthStatus: z.enum(['ready', 'monitoring', 'injured', 'isolated']),
  isTrainingLocked: z.boolean(),
  identity: z
    .object({
      microchipNumber: z.string().nullish(),
      passportNumber: z.string().nullish(),
      registryName: z.string().nullish(),
      birthCountry: z.string().nullish(),
      markings: z.string().nullish(),
    })
    .nullish(),
  identityRevision: z.number().int().nonnegative().optional(),
  admissionStatus: z.enum(['active', 'candidate', 'rejected']).optional(),
  stallId: referenceSchema,
  trainingLockedAt: z.string().nullish(),
  trainingLockedBy: referenceSchema,
  trainingLockReason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type Horse = z.infer<typeof horseSchema>;
export const healthLabels = {
  ready: 'Sẵn sàng',
  monitoring: 'Theo dõi',
  injured: 'Chấn thương',
  isolated: 'Cách ly',
};
