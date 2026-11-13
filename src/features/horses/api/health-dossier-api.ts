import { apiClient, requestData } from '@/core/network/api-client';
import { AppError } from '@/core/errors/app-error';
import { objectId } from '@/shared/types/api';
import { horseApi } from './horse-api';
import { dossierSchema } from '../types/health-dossier';
export const dossierApi = {
  get: async (id: string, signal?: AbortSignal) => {
    objectId.parse(id);
    await horseApi.detail(id, signal);
    const data = dossierSchema.parse(
      await requestData(apiClient.get('/horses/' + id + '/health-dossier', { signal })),
    );
    if (data.horse._id !== id) throw new AppError('Hồ sơ sức khỏe không khớp ngựa đã chọn.');
    if (data.restricted) return { ...data, records: [], schedules: [], injuries: [] };
    return data;
  },
};
