import { z } from 'zod';
import { apiClient, requestData } from '@/core/network/api-client';
export const cabinetRoles = ['club_manager', 'veterinarian', 'warehouse_keeper'] as const;
export const cabinetSchema = z.object({
  warehouse: z
    .object({ _id: z.string(), name: z.string(), stockVersion: z.number().int().nonnegative() })
    .nullable(),
  items: z.array(
    z.object({
      _id: z.string(),
      name: z.string(),
      code: z.string(),
      unit: z.string(),
      strength: z.string(),
      dosageForm: z.string(),
      available: z.number().nonnegative(),
      lots: z.array(
        z.object({ code: z.string(), expiresOn: z.string(), quantity: z.number().nonnegative() }),
      ),
    }),
  ),
});
export const cabinetApi = {
  get: async (signal?: AbortSignal) =>
    cabinetSchema.parse(await requestData(apiClient.get('/prescriptions/cabinet', { signal }))),
};
