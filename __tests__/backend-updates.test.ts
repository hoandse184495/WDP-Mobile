import { apiClient } from '@/core/network/api-client';
import { environment } from '@/core/config/environment';
beforeEach(() => {
  environment.apiUrl = 'http://10.0.2.2:3000/api';
});
import { taskApi } from '@/features/tasks/api/task-api';
import { finishSchema, startSchema } from '@/features/tasks/schemas/task-schema';
import { horseCreateBody } from '@/features/horses/api/horse-api';
import { horseInputSchema } from '@/features/horses/schemas/horse-schema';
import { reviewSchema } from '@/features/training/schemas/training-schema';
import { allowedOperation, findOperation } from '@/features/operations/contracts/registry';
import {
  operationErrors,
  operationInitial,
  operationSchema,
} from '@/features/operations/contracts/business-rules';
import { referenceSource } from '@/features/operations/hooks/use-reference-options';
import { schemaFor } from '@/features/operations/contracts/schema';

jest.mock('@/core/network/photo-upload', () => ({ pickAndUploadPhoto: jest.fn() }));
const id = 'a'.repeat(24);
const op = (name: string) => findOperation(name)!;

test('start forwards a scenario and finish uses the current contract without retired checkpoints', async () => {
  const requests: { url?: string; body: unknown }[] = [];
  apiClient.defaults.adapter = async (config) => {
    requests.push({
      url: config.url,
      body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    });
    return {
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { success: true, data: { task: {} } },
    };
  };
  await taskApi.start(id, { scenario: 'heart_rate' });
  await taskApi.finish(id, { notes: 'Đã bàn giao và đưa ngựa về' });
  expect(requests).toEqual([
    { url: `/daily-tasks/${id}/start`, body: { scenario: 'heart_rate' } },
    {
      url: `/daily-tasks/${id}/finish`,
      body: { notes: 'Đã bàn giao và đưa ngựa về' },
    },
  ]);
  expect(startSchema.safeParse({ scenario: 'device' }).success).toBe(false);
  expect(finishSchema.parse({ notes: '' })).not.toHaveProperty('autoCompleteCheckpoints');
});

test('new horse input keeps optional care assignments and omits only empty selections', () => {
  const input = horseInputSchema.parse({
    name: 'Thiên Phong',
    registrationCode: 'AP-201',
    breed: 'Thoroughbred',
    gender: 'stallion',
    dateOfBirth: '2021-03-15',
    ownerId: id,
    color: 'Nâu',
    notes: '',
    stallId: id,
    trainerId: id,
    groomId: id,
    vetId: id,
  });
  expect(horseCreateBody(input)).toMatchObject({
    stallId: id,
    trainerId: id,
    groomId: id,
    vetId: id,
  });
  expect(horseCreateBody({ ...input, stallId: '', trainerId: '', groomId: '', vetId: '' })).toEqual(
    expect.not.objectContaining({ stallId: expect.anything() }),
  );
  expect(horseInputSchema.safeParse({ ...input, vetId: 'invalid' }).success).toBe(false);
});

test.each(['club_manager', 'veterinarian'] as const)(
  '%s emergency actions follow the current lock state',
  (role) => {
    expect(
      allowedOperation(op('horses.emergency-lock'), role, { isTrainingLocked: false }, id),
    ).toBe(true);
    expect(
      allowedOperation(op('horses.emergency-lock'), role, { isTrainingLocked: true }, id),
    ).toBe(false);
    expect(
      allowedOperation(op('horses.emergency-unlock'), role, { isTrainingLocked: true }, id),
    ).toBe(true);
    expect(
      allowedOperation(op('horses.emergency-unlock'), role, { isTrainingLocked: false }, id),
    ).toBe(false);
  },
);

test.each(['groom', 'head_trainer', 'warehouse_keeper', 'horse_owner'] as const)(
  '%s cannot lock or unlock horses',
  (role) => {
    expect(
      allowedOperation(op('horses.emergency-lock'), role, { isTrainingLocked: false }, id),
    ).toBe(false);
    expect(
      allowedOperation(op('horses.emergency-unlock'), role, { isTrainingLocked: true }, id),
    ).toBe(false);
  },
);

test('height, soft coordination and fitness score match the updated contracts without granting Groom review rights', () => {
  expect(schemaFor('medicalRecord.createMedicalRecordSchema').properties?.height).toMatchObject({
    type: 'number',
    maximum: 30,
  });
  expect(
    schemaFor('medicalEncounter.encounterSchema').properties?.record.properties?.height,
  ).toBeDefined();
  expect(operationSchema(op('schedules.create')).properties?.autoCoordinate).toBeDefined();
  expect(
    referenceSource(op('schedules.create'), 'groomId', 'veterinarian', 'groomId'),
  ).toMatchObject({ path: '/stables', key: 'assignments' });
  const initial = operationInitial(op('schedules.create'), {});
  expect(initial.autoCoordinate).toBe(true);
  expect(
    operationErrors(op('schedules.create'), {
      horseId: id,
      type: 'follow_up',
      title: 'Tái khám',
      dueDate: initial.dueDate,
      repeatDays: 0,
      notes: '',
      autoCoordinate: true,
    }),
  ).toEqual([]);
  expect(
    reviewSchema.safeParse({ performanceRating: 4, trainerNotes: 'Đạt', fitnessScore: 85 }).success,
  ).toBe(true);
  expect(
    reviewSchema.safeParse({ performanceRating: 4, trainerNotes: 'Đạt', fitnessScore: 101 })
      .success,
  ).toBe(false);
  expect(operationSchema(op('sessions.notes')).properties).not.toHaveProperty('fitnessScore');
  expect(findOperation('tasks.checkpoint')).toBeUndefined();
});
import { prepareOperation } from '@/features/operations/contracts/business-rules';
import { referencePayload } from '@/features/operations/hooks/use-reference-options';

test('bulk work keeps distinct stable request keys and validates per-task targets', () => {
  const input = {
    requestKey: '12345678-1234-4234-8234-123456789abc',
    tasks: [
      {
        title: 'Tắm',
        type: 'bathing',
        groomId: id,
        horseId: id,
        scheduledStartAt: '2026-11-09T08:00:00+07:00',
        scheduledEndAt: '2026-11-09T08:30:00+07:00',
        instructions: '',
      },
      {
        title: 'Vệ sinh ô',
        type: 'stall_cleaning',
        groomId: id,
        stallId: id,
        scheduledStartAt: '2026-11-09T08:30:00+07:00',
        scheduledEndAt: '2026-11-09T09:00:00+07:00',
        instructions: '',
      },
    ],
  };
  const body = prepareOperation(op('tasks.bulk'), input);
  expect(prepareOperation(op('tasks.bulk'), input)).toEqual(body);
  const rows = body.tasks as { requestKey: string }[];
  expect(rows[0].requestKey).not.toEqual(rows[1].requestKey);
  expect(operationErrors(op('tasks.bulk'), body)).toEqual([]);
  const invalid = prepareOperation(op('tasks.bulk'), {
    ...input,
    tasks: [{ ...input.tasks[0], type: 'training' }],
  });
  expect(operationErrors(op('tasks.bulk'), invalid)).toContain(
    'Công việc 1: Chọn đúng ngựa/ô và giáo án cho loại công việc.',
  );
  expect(allowedOperation(op('tasks.bulk'), 'groom')).toBe(false);
});

test('nested task choices use the horse in their own row', () => {
  const payload = {
    horseId: 'outer',
    tasks: [
      { horseId: 'first', trainingPlanId: 'plan-1' },
      { horseId: 'second', trainingPlanId: 'plan-2' },
    ],
  };
  expect(referencePayload(payload, 'tasks.0.trainingExerciseKey')).toMatchObject({
    horseId: 'first',
    trainingPlanId: 'plan-1',
  });
  expect(referencePayload(payload, 'tasks.1.trainingExerciseKey')).toMatchObject({
    horseId: 'second',
    trainingPlanId: 'plan-2',
  });
});
