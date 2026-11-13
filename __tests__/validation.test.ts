import { loginSchema, passwordSchema } from '@/features/auth/schemas/auth-schema';
import { measurementsSchema } from '@/features/tasks/schemas/task-schema';
import { horseInputSchema, horseEditSchema } from '@/features/horses/schemas/horse-schema';
import { trainingSchema } from '@/features/training/schemas/training-schema';
import { incidentSchema } from '@/features/incidents/schemas/incident-schema';
import { clubDate, shiftDay } from '@/core/utils/date';
import { utf8Length } from '@/core/utils/utf8';
import { validateApiUrl } from '@/core/config/environment';

test('login rejects invalid email and does not trim passwords', () => {
  expect(loginSchema.safeParse({ email: 'invalid', password: 'x' }).success).toBe(false);
  expect(loginSchema.parse({ email: 'staff@example.com', password: '  secret  ' }).password).toBe(
    '  secret  ',
  );
});
test('password rules enforce confirmation and UTF-8 bcrypt limit', () => {
  const valid = {
    currentPassword: 'old',
    newPassword: 'a'.repeat(12),
    confirmPassword: 'a'.repeat(12),
  };
  expect(passwordSchema.safeParse(valid).success).toBe(true);
  expect(passwordSchema.safeParse({ ...valid, confirmPassword: 'different' }).success).toBe(false);
  expect(
    passwordSchema.safeParse({
      ...valid,
      newPassword: '🐎'.repeat(19),
      confirmPassword: '🐎'.repeat(19),
    }).success,
  ).toBe(false);
  expect(utf8Length('aé🐎')).toBe(7);
});
test('horse validation rejects future, impossible date, unknown owner and invalid metrics', () => {
  const horse = {
    name: 'Horse',
    registrationCode: 'H01',
    breed: 'TB',
    gender: 'colt',
    dateOfBirth: '2020-01-01',
    ownerId: 'a'.repeat(24),
    color: '',
    notes: '',
  };
  expect(horseInputSchema.safeParse(horse).success).toBe(true);
  expect(horseInputSchema.safeParse({ ...horse, dateOfBirth: '2025-02-30' }).success).toBe(false);
  expect(horseInputSchema.safeParse({ ...horse, dateOfBirth: '2099-01-01' }).success).toBe(false);
  expect(horseInputSchema.safeParse({ ...horse, ownerId: 'bad' }).success).toBe(false);
  expect(
    horseEditSchema.safeParse({
      name: 'Horse',
      breed: 'TB',
      notes: '',
      currentWeight: '-1',
      height: '',
      fitnessScore: '101',
    }).success,
  ).toBe(false);
});
test('training schema rejects date reversal and duplicate exercise keys', () => {
  const exercise = {
    key: 'run',
    title: 'Run',
    distance: 1000,
    surface: 'dirt',
    workloadLevel: 'light',
    targetHeartRateMax: 180,
    targetSpeedMax: 15,
    instructions: '',
  };
  const input = {
    title: 'Plan',
    horseId: 'a'.repeat(24),
    phase: 'build_up',
    startDate: '2026-01-01',
    endDate: '2026-01-02',
    description: '',
    instructions: '',
    exercises: [exercise],
  };
  expect(trainingSchema.safeParse(input).success).toBe(true);
  expect(trainingSchema.safeParse({ ...input, endDate: '2025-01-01' }).success).toBe(false);
  expect(trainingSchema.safeParse({ ...input, exercises: [exercise, exercise] }).success).toBe(
    false,
  );
});
test('measurements reject impossible heart-rate ordering', () => {
  expect(
    measurementsSchema.safeParse({
      distanceCompleted: 1000,
      durationMinutes: 2,
      maxSpeed: 15,
      avgHeartRate: 200,
      maxHeartRate: 180,
    }).success,
  ).toBe(false);
});
test('incidents require exactly one target and a real observation time', () => {
  const input = {
    title: 'Incident',
    category: 'other',
    priority: 'normal',
    observedAt: '2020-01-01T00:00:00Z',
    description: 'Observed problem',
    requestKey: 'dbe4ae08-91dc-4381-a5cd-f0becc19cfe0',
    horseId: 'a'.repeat(24),
  };
  expect(incidentSchema.safeParse(input).success).toBe(true);
  expect(incidentSchema.safeParse({ ...input, stallId: 'b'.repeat(24) }).success).toBe(false);
  expect(incidentSchema.safeParse({ ...input, observedAt: '2099-01-01T00:00:00Z' }).success).toBe(
    false,
  );
});
test('club date changes at midnight Vietnam independently of device timezone', () => {
  expect(clubDate(new Date('2026-01-01T16:59:00Z'))).toBe('2026-01-01');
  expect(clubDate(new Date('2026-01-01T17:00:00Z'))).toBe('2026-01-02');
  expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
});
test('production URLs require HTTPS and never contain credentials', () => {
  expect(validateApiUrl('http://10.0.2.2:3000/api/', 'development')).toBe(
    'http://10.0.2.2:3000/api',
  );
  expect(() => validateApiUrl(undefined, 'production')).toThrow();
  expect(() => validateApiUrl('http://example.com/api', 'production')).toThrow();
  expect(() => validateApiUrl('https://user:secret@example.com/api', 'production')).toThrow();
});
