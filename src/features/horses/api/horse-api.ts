import { z } from 'zod';
import { apiClient, requestData } from '@/core/network/api-client';
import { ListParams, parsePage, referenceSchema } from '@/shared/types/api';
import { horseSchema } from '../types/horse';
import { HorseEdit, HorseInput } from '../schemas/horse-schema';
export function horseCreateBody(input: HorseInput) {
  const body = { ...input };
  for (const key of ['stallId', 'trainerId', 'groomId', 'vetId'] as const)
    if (!body[key]) delete body[key];
  return body;
}
const staffOption = z.object({ _id: z.string(), fullName: z.string() });
export const horseApi = {
  creationOptions: async () =>
    z
      .object({
        stalls: z.array(
          z.object({
            _id: z.string(),
            code: z.string(),
            type: z.string(),
            isActive: z.boolean(),
            maintenance: z.boolean().optional(),
            occupied: z.boolean(),
            stableId: referenceSchema,
          }),
        ),
        grooms: z.array(staffOption),
        trainers: z.array(staffOption),
        vets: z.array(staffOption),
      })
      .parse(await requestData(apiClient.get('/stables'))),
  list: async (params: ListParams & { search?: string }, signal?: AbortSignal) =>
    parsePage(
      await requestData(apiClient.get('/horses', { params, signal })),
      'horses',
      horseSchema,
    ),
  detail: async (id: string, signal?: AbortSignal) =>
    horseSchema.parse((await requestData(apiClient.get(`/horses/${id}`, { signal }))).horse),
  create: async (input: HorseInput) =>
    horseSchema.parse((await requestData(apiClient.post('/horses', horseCreateBody(input)))).horse),
  update: async (id: string, input: HorseEdit) =>
    horseSchema.parse(
      (
        await requestData(
          apiClient.put(`/horses/${id}`, {
            ...input,
            currentWeight: input.currentWeight ? Number(input.currentWeight) : undefined,
            height: input.height ? Number(input.height) : undefined,
            fitnessScore: Number(input.fitnessScore),
          }),
        )
      ).horse,
    ),
  owners: async (page: number, signal?: AbortSignal) =>
    parsePage(
      await requestData(
        apiClient.get('/users', { params: { page, limit: 20, role: 'horse_owner' }, signal }),
      ),
      'users',
      z.object({ _id: z.string(), fullName: z.string(), isActive: z.boolean() }),
    ),
};
