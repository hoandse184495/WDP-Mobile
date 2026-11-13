import { apiClient, requestData } from '@/core/network/api-client';
import { parsePage } from '@/shared/types/api';
import { AppError } from '@/core/errors/app-error';
import { recordSchema, recordId, type WorkspaceRecord } from '@/features/workspace/types/catalog';
// There is no GET /training-sessions/:id. Keep the server's role/horse scope by
// finding the record in its paginated listing, including beyond the first page.
export const sessionApi = {
  get: async (id: string, signal?: AbortSignal): Promise<WorkspaceRecord> => {
    let page = 1;
    while (true) {
      const result = parsePage(
        await requestData(
          apiClient.get('/training-sessions', {
            params: { page, limit: 100 },
            signal,
          }),
        ),
        'sessions',
        recordSchema,
      );
      const record = result.items.find((row) => recordId(row) === id);
      if (record) return record;
      if (page >= result.pagination.totalPages) break;
      page += 1;
    }
    throw new AppError('Buổi tập không còn tồn tại hoặc nằm ngoài phạm vi được xem.', 404);
  },
};
