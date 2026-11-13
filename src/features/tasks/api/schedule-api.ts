import { z } from 'zod';
import { apiClient, requestData } from '@/core/network/api-client';
import { referenceSchema, referenceId } from '@/shared/types/api';
import { ScheduleInput } from '../schemas/schedule-schema';
const optionsSchema = z.object({
  grooms: z.array(z.object({ _id: z.string(), fullName: z.string() })),
  assignments: z.array(z.object({ groomId: referenceSchema, horseId: referenceSchema })),
  stalls: z.array(z.object({ _id: z.string(), code: z.string() })),
  plans: z.array(
    z.object({
      _id: z.string(),
      title: z.string(),
      horseId: referenceSchema,
      revision: z.number().optional(),
      exercises: z.array(z.object({ key: z.string(), title: z.string() })).optional(),
    }),
  ),
  rationPlans: z.array(
    z.object({
      _id: z.string(),
      title: z.string(),
      horseId: referenceSchema,
      meals: z.array(z.object({ key: z.string(), name: z.string() })),
    }),
  ),
});
export const scheduleApi = {
  options: async () =>
    optionsSchema.parse(await requestData(apiClient.get('/daily-tasks/options'))),
  create: (input: ScheduleInput, requestKey: string, trainingPlanRevision?: number) =>
    requestData(
      apiClient.post('/daily-tasks', scheduledTask(input, requestKey, trainingPlanRevision)),
    ),
  previewBatch: (input: ScheduleInput, dates: string[], requestKey: string, revision?: number) =>
    requestData(
      apiClient.post('/daily-tasks/batch/preview', {
        task: scheduledTask(input, requestKey, revision),
        dates,
      }),
    ),
  createBatch: (input: ScheduleInput, dates: string[], requestKey: string, revision?: number) =>
    requestData(
      apiClient.post('/daily-tasks/batch', {
        task: scheduledTask(input, requestKey, revision),
        dates,
      }),
    ),
};
export function scheduledTask(
  input: ScheduleInput,
  requestKey: string,
  trainingPlanRevision?: number,
) {
  return {
    title: input.title,
    type: input.type,
    groomId: input.groomId,
    scheduledStartAt: `${input.start}:00+07:00`,
    scheduledEndAt: `${input.end}:00+07:00`,
    instructions: input.instructions,
    requestKey,
    ...(input.type === 'stall_cleaning' ? { stallId: input.stallId } : { horseId: input.horseId }),
    ...(input.type === 'training'
      ? {
          trainingPlanId: input.trainingPlanId,
          trainingExerciseKey: input.trainingExerciseKey,
          trainingPlanRevision,
        }
      : {}),
    ...(input.type === 'feeding'
      ? { rationPlanId: input.rationPlanId, rationMealKey: input.rationMealKey }
      : {}),
  };
}
export const assignedGrooms = (
  assignments: z.infer<typeof optionsSchema>['assignments'],
  horseId: string,
) =>
  new Set(
    assignments
      .filter((a) => referenceId(a.horseId) === horseId)
      .map((a) => referenceId(a.groomId)),
  );
