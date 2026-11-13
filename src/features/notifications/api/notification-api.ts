import { z } from 'zod';
import { apiClient, requestData } from '@/core/network/api-client';
import { parsePage } from '@/shared/types/api';
const notificationSchema = z
  .object({
    _id: z.string(),
    title: z.string(),
    message: z.string(),
    readAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .transform((row) => ({ ...row, isRead: row.readAt !== null }));
export const notificationApi = {
  batchTasks: async (id: string, signal?: AbortSignal) =>
    z
      .object({
        tasks: z.array(
          z.object({
            _id: z.string(),
            title: z.string(),
            type: z.string(),
            status: z.string(),
            scheduledStartAt: z.string(),
            scheduledEndAt: z.string(),
          }),
        ),
        count: z.number(),
        unavailableCount: z.number(),
      })
      .parse(await requestData(apiClient.get(`/notifications/${id}/tasks`, { signal }))),
  list: async (page: number, unreadOnly: boolean, signal?: AbortSignal) => {
    const data = await requestData(
      apiClient.get('/notifications', {
        params: { page, limit: 20, unreadOnly: String(unreadOnly) },
        signal,
      }),
    );
    return {
      ...parsePage(data, 'notifications', notificationSchema),
      ...z.object({ unreadCount: z.number(), serverNow: z.string() }).parse(data),
    };
  },
  read: (id: string) => requestData(apiClient.patch(`/notifications/${id}/read`, {})),
  readAll: (through: string) =>
    requestData(apiClient.patch('/notifications/read-all', { through })),
  target: async (id: string) =>
    z
      .union([
        z.object({ path: z.string() }),
        z.object({
          kind: z.literal('task_notice'),
          receipt: z.object({ title: z.string(), message: z.string(), createdAt: z.string() }),
        }),
      ])
      .parse(await requestData(apiClient.get(`/notifications/${id}/target`))),
};
