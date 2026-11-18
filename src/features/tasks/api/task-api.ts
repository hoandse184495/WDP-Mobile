import { z } from 'zod';
import { apiClient, requestData } from '@/core/network/api-client';
import { parsePage } from '@/shared/types/api';
import { pickAndUploadPhoto } from '@/core/network/photo-upload';
import { evidenceSchema, feedingPreviewSchema, taskSchema } from '../types/task';
import { FinishInput, finishSchema, StartInput, startSchema } from '../schemas/task-schema';
export const taskApi = {
  list: async (date: string, page: number, status?: string, signal?: AbortSignal) =>
    parsePage(
      await requestData(
        apiClient.get('/daily-tasks', {
          params: { date, page, limit: 20, status: status || undefined },
          signal,
        }),
      ),
      'tasks',
      taskSchema,
    ),
  detail: async (id: string, signal?: AbortSignal) =>
    taskSchema.parse((await requestData(apiClient.get(`/daily-tasks/${id}`, { signal }))).task),
  start: (id: string, input: StartInput = {}) =>
    requestData(apiClient.post(`/daily-tasks/${id}/start`, startSchema.parse(input))),
  finish: (id: string, input: FinishInput) =>
    requestData(apiClient.post(`/daily-tasks/${id}/finish`, finishSchema.parse(input))),
  cancel: (id: string, revision: number, reason: string) =>
    requestData(apiClient.post(`/daily-tasks/${id}/cancel`, { revision, reason })),
  evidence: async (id: string, signal?: AbortSignal) =>
    evidenceSchema.parse(
      await requestData(apiClient.get(`/daily-tasks/${id}/evidence`, { signal })),
    ),
  upload: (id: string, revision: number, camera: boolean) =>
    pickAndUploadPhoto(`/daily-tasks/${id}/evidence`, revision, camera),
  removePhoto: (id: string, photoId: string, revision: number) =>
    requestData(apiClient.delete(`/daily-tasks/${id}/evidence/${photoId}`, { data: { revision } })),
  photoUrl: async (id: string, photoId: string) =>
    z
      .object({ url: z.url(), expiresAt: z.string() })
      .parse(await requestData(apiClient.get(`/daily-tasks/${id}/evidence/${photoId}/url`))),
  feedingPreview: async (id: string, signal?: AbortSignal) =>
    feedingPreviewSchema.parse(
      await requestData(apiClient.get(`/daily-tasks/${id}/feeding-stock`, { signal })),
    ),
};
