import { sessionApi } from '@/features/training/api/session-api';
import { z } from 'zod';
import { apiClient, requestData } from '@/core/network/api-client';
import { parsePage, Page } from '@/shared/types/api';
import { AppError } from '@/core/errors/app-error';
import { getModule, recordSchema, WorkspaceRecord } from '../types/catalog';
import { clubDate, shiftDay } from '@/core/utils/date';
export const workspaceApi = {
  list: async (
    module: string,
    page: number,
    horseId?: string,
    signal?: AbortSignal,
    filters: Record<string, unknown> = {},
  ): Promise<Page<WorkspaceRecord> & { summary?: unknown }> => {
    const config = getModule(module);
    if (!config) throw new AppError('Không tìm thấy chức năng.');
    const data = await requestData(
      apiClient.get(config.path, {
        params: config.unpaged
          ? undefined
          : {
              page,
              limit: 20,
              ...(module === 'staffWork'
                ? { startDate: shiftDay(clubDate(), -7), endDate: shiftDay(clubDate(), 7) }
                : {}),
              ...filters,
              ...(config.horseFilter && horseId ? { horseId } : {}),
            },
        signal,
      }),
    );
    if (config.unpaged) {
      const items = z.array(recordSchema).parse(data[config.key]);
      return {
        items,
        pagination: {
          page: 1,
          limit: items.length,
          total: items.length,
          totalPages: items.length ? 1 : 0,
        },
      };
    }
    return { ...parsePage(data, config.key, recordSchema), summary: data.summary };
  },
  detail: async (
    module: string,
    id: string,
    signal?: AbortSignal,
    page = 1,
    date = clubDate(),
  ): Promise<WorkspaceRecord> => {
    if (module === 'sessions') return sessionApi.get(id, signal);
    // These modules no longer expose GET /:id. Re-read the authorized, paginated collection.
    if (['training', 'medical', 'injuries'].includes(module)) {
      for (let current = 1; ; current++) {
        const result = await workspaceApi.list(module, current, undefined, signal);
        const record = result.items.find((row) => (row._id ?? row.id) === id);
        if (record) return record;
        if (current >= result.pagination.totalPages) break;
      }
      throw new AppError('Không tìm thấy hồ sơ trong phạm vi được phép.', 404);
    }
    if (module === 'stalls') {
      const data = await requestData(
        apiClient.get('/stables/stalls/' + encodeURIComponent(id) + '/details', {
          params: { date },
          signal,
        }),
      );
      return { ...recordSchema.parse(data.stall), _details: data };
    }
    const config = getModule(module);
    if (!config?.detailKey) throw new AppError('Không có API chi tiết cho màn hình này.');
    const data = await requestData(
      apiClient.get(config.unpaged ? config.path : `${config.path}/${id}`, {
        signal,
        params: { page, limit: 100 },
      }),
    );
    const row = config.unpaged
      ? Array.isArray(data[config.key])
        ? (data[config.key] as unknown[]).find(
            (value) => value && typeof value === 'object' && '_id' in value && value._id === id,
          )
        : null
      : config.detailKey === '$self'
        ? data
        : data[config.detailKey];
    return { ...recordSchema.parse(row), _details: data };
  },
};
