import { clubDate } from '@/core/utils/date';
import {
  asRecord,
  entityId,
  type JsonRecord,
  type Operation,
} from '@/features/operations/types/operation';

export function inventoryOptions(
  operation: Operation,
  key: string,
  rows: JsonRecord[],
  payload: JsonRecord,
  warehouse?: JsonRecord,
): JsonRecord[] {
  if (['warehouseId', 'sourceWarehouseId', 'destinationWarehouseId'].includes(key)) {
    rows = rows.filter(
      (row) => row.isActive !== false && asRecord(row.stableId).isActive !== false,
    );
    if (operation.module === 'receipts') rows = rows.filter((row) => row.type === 'central');
    if (operation.module === 'transfers' && key === 'destinationWarehouseId')
      rows = rows.filter((row) => entityId(row) !== entityId(payload.sourceWarehouseId));
  }
  if (operation.module === 'transfers' && key === 'balanceId') {
    if (!warehouse || !payload.destinationWarehouseId) return [];
    rows = rows.filter((row) => {
      const item = asRecord(row.item),
        lot = asRecord(row.lot);
      if (
        Number(row.quantity) <= 0 ||
        item.isActive === false ||
        row.lotState === 'expired' ||
        row.transferable === false
      )
        return false;
      if (lot.expiresOn && String(lot.expiresOn) < clubDate()) return false;
      if (warehouse.type === 'medicine_cabinet')
        return item.category === 'medicine' && Boolean(lot.code && lot.expiresOn);
      return warehouse.type !== 'stable' || item.category !== 'medicine';
    });
  }
  if (operation.id === 'replenishments.create' && key === 'itemId') {
    if (!warehouse && !payload.taskId) return [];
    rows = rows.filter(
      (row) =>
        row.isActive !== false &&
        (row.category === undefined ||
          row.category === (warehouse?.type === 'medicine_cabinet' ? 'medicine' : 'feed')),
    );
  }
  return rows;
}
