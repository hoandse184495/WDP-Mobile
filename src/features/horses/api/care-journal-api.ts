import { apiClient, requestData } from '@/core/network/api-client';
import { AppError } from '@/core/errors/app-error';
import { objectId } from '@/shared/types/api';
import { horseApi } from './horse-api';
import { careJournalSchema, lockHistorySchema } from '../types/care-journal';
import { validJournalDay } from '../utils/care-journal';
// These feeds do not apply every horse assignment scope server-side. Verify scoped detail first.
async function scopedHorse(id: string, signal?: AbortSignal) {
  objectId.parse(id);
  return horseApi.detail(id, signal);
}
export const careJournalApi = {
  get: async (id: string, date: string, signal?: AbortSignal) => {
    if (!validJournalDay(date)) throw new AppError('Ngày nhật ký không hợp lệ.');
    await scopedHorse(id, signal);
    const journal = careJournalSchema.parse(
      await requestData(
        apiClient.get('/horses/' + id + '/care-journal', { params: { date }, signal }),
      ),
    );
    if (journal.horse._id !== id || journal.date !== date)
      throw new AppError('Nhật ký không khớp ngựa hoặc ngày đã chọn.');
    return journal;
  },
  history: async (id: string, signal?: AbortSignal) => {
    await scopedHorse(id, signal);
    return lockHistorySchema.parse(
      (await requestData(apiClient.get('/horses/' + id + '/lock-history', { signal }))).history,
    );
  },
};
