import { z } from 'zod';
import { apiClient, requestData } from '@/core/network/api-client';
const demand = z.object({
  itemId: z.string(),
  code: z.string(),
  name: z.string(),
  unit: z.string(),
  dailyNeed: z.number().nonnegative(),
  sevenDayNeed: z.number().nonnegative(),
  centralStock: z.number().nonnegative(),
  branchStock: z.number().nonnegative(),
});
export const feedForecastSchema = z.object({
  day: z.string(),
  days: z.number().int().positive(),
  areas: z.array(
    z.object({
      stableId: z.string(),
      stableName: z.string(),
      horseCount: z.number().int().nonnegative(),
      items: z.array(demand),
    }),
  ),
  summaryItems: z.array(
    demand.extend({ totalStock: z.number().nonnegative(), shortage7d: z.number().nonnegative() }),
  ),
});
export type FeedForecast = z.infer<typeof feedForecastSchema>;
export const feedForecastApi = {
  get: async (signal?: AbortSignal) =>
    feedForecastSchema.parse(
      await requestData(apiClient.get('/inventory/feed-forecast', { signal })),
    ),
};
