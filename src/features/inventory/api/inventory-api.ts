import { z } from 'zod';
import { apiClient, requestData } from '@/core/network/api-client';
import { parsePage } from '@/shared/types/api';
export const warehouseSchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    type: z.enum(['central', 'stable', 'medicine_cabinet']),
    isActive: z.boolean(),
    assignedGroomIds: z.array(z.object({ _id: z.string(), fullName: z.string() })).optional(),
    responsibleVetName: z.string().optional(),
    stocktakeNumber: z.string().optional(),
    revision: z.number().optional(),
  })
  .passthrough();
const balanceSchema = z.object({
  _id: z.string(),
  item: z.object({ _id: z.string(), name: z.string(), unit: z.string() }),
  lot: z.object({ code: z.string(), expiresOn: z.string().nullable() }).nullable(),
  quantity: z.number(),
  lotState: z.string(),
});
const ledgerRowSchema = z
  .object({
    key: z.string(),
    type: z.string(),
    quantity: z.number(),
    occurredAt: z.string(),
    actorName: z.string(),
    number: z.string().optional(),
  })
  .passthrough();
export const inventoryApi = {
  warehouse: async (id: string, signal?: AbortSignal) => {
    for (let page = 1; ; page++) {
      const data = parsePage(
        await requestData(
          apiClient.get('/inventory/warehouses', { params: { page, limit: 100 }, signal }),
        ),
        'warehouses',
        warehouseSchema,
      );
      const warehouse = data.items.find((row) => row._id === id);
      if (warehouse) return warehouse;
      if (page >= data.pagination.totalPages)
        throw new Error('Không tìm thấy kho trong phạm vi được xem.');
    }
  },
  ledgerOptions: async (warehouseId: string, itemId: string) =>
    z
      .object({
        lots: z.array(
          z.object({ _id: z.string(), code: z.string(), expiresOn: z.string().nullish() }),
        ),
      })
      .parse(
        await requestData(
          apiClient.get('/inventory/ledger/options', { params: { warehouseId, itemId } }),
        ),
      ),
  document: (type: string, id: string) =>
    requestData(
      apiClient.get(`/inventory/ledger/${encodeURIComponent(type)}/${encodeURIComponent(id)}`),
    ),
  stock: async (warehouseId: string, page: number, search: string, signal?: AbortSignal) =>
    parsePage(
      await requestData(
        apiClient.get('/inventory/stock', {
          params: { warehouseId, page, limit: 20, search: search || undefined },
          signal,
        }),
      ),
      'balances',
      balanceSchema,
    ),
  ledger: async (
    params: {
      warehouseId: string;
      itemId: string;
      startDate: string;
      endDate: string;
      page: number;
      lotId?: string;
      type?: string;
    },
    signal?: AbortSignal,
  ) => {
    const data = await requestData(
      apiClient.get('/inventory/ledger', { params: { ...params, limit: 20 }, signal }),
    );
    return {
      ...parsePage(data, 'rows', ledgerRowSchema),
      summary: z
        .object({
          opening: z.number(),
          incoming: z.number(),
          outgoing: z.number(),
          closing: z.number(),
          difference: z.number(),
        })
        .parse(data.summary),
    };
  },
};
