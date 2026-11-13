import { z } from 'zod';
import { apiClient, requestData } from '@/core/network/api-client';
import { pickAndUploadPhoto } from '@/core/network/photo-upload';
import { recordSchema } from '@/features/workspace/types/catalog';
import { IncidentInput } from '../schemas/incident-schema';
export const incidentApi = {
  removePhoto: (id: string, photoId: string, revision: number) =>
    requestData(apiClient.delete(`/incidents/${id}/photos/${photoId}`, { data: { revision } })),
  options: async () =>
    z
      .object({
        horses: z.array(z.object({ _id: z.string(), name: z.string() })),
        stalls: z.array(z.object({ _id: z.string(), code: z.string() })),
      })
      .parse(await requestData(apiClient.get('/incidents/options'))),
  create: async (input: IncidentInput) =>
    recordSchema.parse((await requestData(apiClient.post('/incidents', input))).report),
  submit: (id: string, revision: number) =>
    requestData(apiClient.post(`/incidents/${id}/submit`, { revision })),
  transition: (id: string, revision: number, status: 'acknowledged' | 'closed', note: string) =>
    requestData(apiClient.patch(`/incidents/${id}/status`, { revision, status, note })),
  upload: (id: string, revision: number, camera: boolean) =>
    pickAndUploadPhoto(`/incidents/${id}/photos`, revision, camera),
  photoUrl: async (id: string, photoId: string) =>
    z
      .object({ url: z.url() })
      .parse(await requestData(apiClient.get(`/incidents/${id}/photos/${photoId}/url`))),
};
