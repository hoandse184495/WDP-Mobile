import { z } from 'zod';
const text = z.string().nullish(),
  number = z.number().finite().nullish();
const person = z.object({ _id: z.string().optional(), fullName: text, role: text }).nullish();
export const clinicalRoles = ['club_manager', 'veterinarian', 'horse_owner'] as const;
const medicineLine = z.object({
  _id: z.string().optional(),
  name: text,
  code: text,
  unit: text,
  strength: text,
  dosageForm: text,
  dosage: text,
  route: text,
  frequency: text,
  durationDays: number,
  instructions: text,
  quantity: number,
  supplied: number,
  remaining: number,
  lotCode: text,
  expiresOn: text,
});
const issue = z.object({
  _id: z.string(),
  number: z.string(),
  confirmedAt: text,
  note: text,
  warehouse: z.object({ name: text, type: text }).nullish(),
  confirmedBy: person,
  recipient: person,
  lines: z.array(medicineLine).default([]),
});
export const clinicalRecordSchema = z.object({
  _id: z.string(),
  horseId: z.string().optional(),
  examinationDate: z.string(),
  type: text,
  veterinarianId: person,
  weight: number,
  height: number,
  temperature: number,
  heartRate: number,
  respiratoryRate: number,
  symptoms: z.array(z.string()).default([]),
  diagnosis: text,
  treatment: text,
  notes: text,
  nextCheckupDate: text,
  medications: z
    .array(z.object({ name: text, dosage: text, frequency: text, durationDays: number }))
    .default([]),
  prescription: z
    .object({
      status: z.string(),
      stopReason: text,
      recipient: person,
      lines: z.array(medicineLine).default([]),
    })
    .nullish(),
  issues: z.array(issue).default([]),
});
export const clinicalScheduleSchema = z.object({
  _id: z.string(),
  type: z.string(),
  title: z.string(),
  dueDate: z.string(),
  status: z.string(),
  displayStatus: text,
  veterinarianId: person,
  groom: person,
  result: text,
  completedAt: text,
  nextDueDate: text,
  location: text,
  startTime: text,
  endTime: text,
  notes: text,
  cancelReason: text,
  administration: z
    .object({ performedOn: text, productName: text, dose: text, lotNumber: text, reaction: text })
    .nullish(),
  medicineIssue: issue.nullish(),
  linkedRecord: clinicalRecordSchema.nullish(),
});
export const dossierSchema = z.object({
  restricted: z.boolean(),
  restrictionReason: text,
  today: z.string(),
  horse: z.object({
    _id: z.string(),
    name: z.string(),
    registrationCode: z.string(),
    healthStatus: text,
    admissionStatus: text,
  }),
  records: z.array(clinicalRecordSchema),
  schedules: z.array(clinicalScheduleSchema),
  injuries: z.array(
    z.object({
      _id: z.string(),
      injuryDate: text,
      affectedArea: text,
      injuryType: text,
      severity: text,
      status: text,
      description: text,
      treatmentPlan: text,
      resolvedNotes: text,
      resolvedAt: text,
      surfaceLocation: z.record(z.string(), z.unknown()).nullish(),
    }),
  ),
});
export type ClinicalRecord = z.infer<typeof clinicalRecordSchema>;
export type ClinicalSchedule = z.infer<typeof clinicalScheduleSchema>;
export type HealthDossier = z.infer<typeof dossierSchema>;
