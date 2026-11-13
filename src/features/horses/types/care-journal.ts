import { clinicalRecordSchema, clinicalScheduleSchema } from './health-dossier';
import { z } from 'zod';
const text = z.string().nullish(),
  number = z.number().finite().nullish(),
  person = z.object({ fullName: text }).nullish();
export const journalPhotoSchema = z.object({
  _id: z.string(),
  fileName: text,
  mimeType: text,
  uploadedAt: text,
  url: text,
});
export const journalTaskSchema = z.object({
  _id: z.string(),
  title: z.string(),
  type: z.string(),
  status: z.string(),
  scheduledStartAt: text,
  scheduledEndAt: text,
  actualStartAt: text,
  actualEndAt: text,
  instructions: text,
  completionNotes: text,
  groom: person,
  stall: z.object({ code: text }).nullish(),
  feedingSnapshot: z.record(z.string(), z.unknown()).nullish(),
  feedingOutcome: text,
  feedingLeftovers: z
    .array(
      z.object({ name: text, unit: text, quantity: number, measurement: text, disposition: text }),
    )
    .nullish(),
  photos: z.array(journalPhotoSchema).default([]),
});
export const journalSessionSchema = z.object({
  _id: z.string(),
  sessionDate: z.string(),
  status: z.string(),
  distanceCompleted: number,
  durationMinutes: number,
  avgSpeed: number,
  maxSpeed: number,
  avgHeartRate: number,
  maxHeartRate: number,
  performanceRating: number,
  trainerNotes: text,
  groomNotes: text,
  trainer: person,
  groom: person,
  plan: z.object({ title: text, phase: text }).nullish(),
});
export const careJournalSchema = z.object({
  horse: z.object({
    _id: z.string(),
    name: z.string(),
    registrationCode: z.string(),
    stallNumber: text,
    healthStatus: z.string(),
    isTrainingLocked: z.boolean(),
    trainingLockReason: text,
    trainer: person,
    assignedGroom: person,
  }),
  date: z.string(),
  summary: z.object({
    meals: z.object({ completed: z.number(), total: z.number(), lastMealTime: text }),
    stallCleaning: z.object({ cleaned: z.boolean(), cleanedAt: text }),
    training: z.object({
      completed: z.boolean(),
      sessionCount: z.number(),
      totalDistance: z.number(),
      avgHeartRate: number,
      trainerName: text,
    }),
    health: z.object({
      status: z.string(),
      isLocked: z.boolean(),
      lockReason: text,
      temperature: number,
      latestCheckupDate: text,
    }),
  }),
  tasks: z.array(journalTaskSchema),
  sessions: z.array(journalSessionSchema),
  medicalRecords: z.array(clinicalRecordSchema).default([]),
  medicalSchedules: z.array(clinicalScheduleSchema).default([]),
});
export const lockHistorySchema = z.array(
  z.object({
    _id: z.string(),
    action: z.string(),
    createdAt: z.string(),
    description: z.string(),
    actorRole: text,
    actorId: z
      .union([z.string(), z.object({ _id: z.string(), fullName: text, role: text })])
      .nullish(),
  }),
);
export type CareJournal = z.infer<typeof careJournalSchema>;
export type JournalTask = z.infer<typeof journalTaskSchema>;
export type JournalSession = z.infer<typeof journalSessionSchema>;
export type JournalPhoto = z.infer<typeof journalPhotoSchema>;
export type LockHistory = z.infer<typeof lockHistorySchema>;
