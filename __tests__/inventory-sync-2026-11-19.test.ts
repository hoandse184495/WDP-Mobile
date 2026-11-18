import { allowedOperation, findOperation } from '@/features/operations/contracts/registry';
import {
  operationInitial,
  operationErrors,
  prepareOperation,
} from '@/features/operations/contracts/business-rules';
import { inventoryOptions } from '@/features/inventory/inventory-options';
import { getModule } from '@/features/workspace/types/catalog';
import { destination } from '@/features/home/config/workspaces';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { feedForecastApi } from '@/features/inventory/api/feed-forecast-api';
import { apiClient } from '@/core/network/api-client';
import { environment } from '@/core/config/environment';
const id = 'a'.repeat(24),
  other = 'b'.repeat(24),
  third = 'c'.repeat(24);
const op = (name: string) => findOperation(name)!;
const adapter = apiClient.defaults.adapter;
afterEach(() => {
  apiClient.defaults.adapter = adapter;
});
beforeEach(() => {
  environment.apiUrl = 'http://10.0.2.2:3000/api';
});

test('independent warehouse form submits Groom IDs and does not require a stable', () => {
  const body = prepareOperation(op('warehouses.create'), {
    code: 'KHO-01',
    name: 'Kho phụ',
    type: 'stable',
    assignedGroomIds: [id, id, other],
    notes: '',
  });
  expect(body.assignedGroomIds).toEqual([id, other]);
  expect(body).not.toHaveProperty('stableId');
  expect(operationErrors(op('warehouses.create'), body)).toEqual([]);
});
test('warehouse edit loads populated Groom assignments and preserves edit revision', () => {
  const initial = operationInitial(op('warehouses.edit'), {
    name: 'Kho phụ',
    type: 'stable',
    revision: 4,
    isActive: true,
    stableId: { _id: third },
    assignedGroomIds: [
      { _id: id, fullName: 'Groom A' },
      { _id: other, fullName: 'Groom B' },
    ],
  });
  expect(initial.assignedGroomIds).toEqual([id, other]);
  expect(initial.revision).toBe(4);
  expect(initial.stableId).toBeUndefined();
});
test('changing to cabinet clears Groom IDs and requires an active Vet selection', () => {
  const body = prepareOperation(op('warehouses.edit'), {
    name: 'Tủ thuốc',
    type: 'medicine_cabinet',
    assignedGroomIds: [id],
    responsibleVetId: other,
    isActive: true,
    revision: 3,
    reason: 'Chuyển loại kho',
  });
  expect(body.assignedGroomIds).toEqual([]);
  expect(operationErrors(op('warehouses.edit'), body)).toEqual([]);
  expect(operationErrors(op('warehouses.edit'), { ...body, responsibleVetId: null })).toContain(
    'Tủ thuốc cần chọn bác sĩ phụ trách chính.',
  );
});
test('changing cabinet back to branch explicitly clears Vet without clearing legacy stable links', () => {
  const body = prepareOperation(op('warehouses.edit'), {
    name: 'Kho phụ',
    type: 'stable',
    responsibleVetId: id,
    stableId: other,
    assignedGroomIds: [third],
    isActive: true,
    revision: 2,
    reason: 'Đổi loại kho',
  });
  expect(body.responsibleVetId).toBeNull();
  expect(body).not.toHaveProperty('stableId');
});
test('Thủ kho can coordinate counts but cannot confirm or cancel an active frozen count', () => {
  expect(allowedOperation(op('stocktakes.create'), 'warehouse_keeper')).toBe(true);
  expect(
    allowedOperation(
      op('stocktakes.recount'),
      'warehouse_keeper',
      { status: 'submitted', counter: other },
      id,
    ),
  ).toBe(true);
  expect(
    allowedOperation(
      op('stocktakes.confirm'),
      'warehouse_keeper',
      { status: 'submitted', counter: other },
      id,
    ),
  ).toBe(false);
  expect(
    allowedOperation(
      op('stocktakes.cancel'),
      'warehouse_keeper',
      { status: 'counting', counter: other },
      id,
    ),
  ).toBe(false);
  expect(
    allowedOperation(
      op('stocktakes.cancel'),
      'warehouse_keeper',
      { status: 'draft', counter: other },
      id,
    ),
  ).toBe(true);
  expect(
    allowedOperation(
      op('stocktakes.recount'),
      'warehouse_keeper',
      { status: 'submitted', counter: id },
      id,
    ),
  ).toBe(false);
});
test('assigned counter alone can start, count and submit', () => {
  expect(
    allowedOperation(op('stocktakes.start'), 'groom', { status: 'draft', counter: other }, id),
  ).toBe(false);
  expect(
    allowedOperation(op('stocktakes.start'), 'groom', { status: 'draft', counter: id }, id),
  ).toBe(true);
});
test('Vet can propose medicine replenishment and disposal, only creator can cancel', () => {
  expect(allowedOperation(op('replenishments.create'), 'veterinarian')).toBe(true);
  expect(allowedOperation(op('disposals.create'), 'veterinarian')).toBe(true);
  expect(getModule('disposals')?.roles).toContain('veterinarian');
  expect(getModule('replenishments')?.roles).toContain('veterinarian');
  expect(
    allowedOperation(
      op('disposals.cancel'),
      'veterinarian',
      { status: 'pending', createdBy: id },
      id,
    ),
  ).toBe(true);
  expect(
    allowedOperation(
      op('disposals.cancel'),
      'veterinarian',
      { status: 'pending', createdBy: other },
      id,
    ),
  ).toBe(false);
  expect(
    allowedOperation(
      op('disposals.cancel'),
      'veterinarian',
      { status: 'confirmed', createdBy: id },
      id,
    ),
  ).toBe(false);
  expect(
    allowedOperation(op('disposals.decision'), 'veterinarian', { status: 'pending' }, id),
  ).toBe(false);
});
test('retired area assignments cannot be opened by navigation or direct module lookup', () => {
  expect(destination('areaAssignments', 'club_manager')).toBeUndefined();
  expect(getModule('areaAssignments')).toBeUndefined();
  expect(findOperation('areaAssignments.create')).toBeUndefined();
});
const balance = (key: string, category: string, expiry: string | null = '2099-01-01') => ({
  _id: key,
  quantity: 5,
  item: { category, isActive: true },
  lot: { code: 'LOT', expiresOn: expiry },
});
const rows = [
  balance('feed', 'feed'),
  balance('care', 'care'),
  balance('medicine', 'medicine'),
  balance('unknown-expiry', 'medicine', null),
  { ...balance('expired', 'medicine'), lotState: 'expired' },
  { ...balance('empty', 'feed'), quantity: 0 },
];
test.each([
  ['stable', ['feed', 'care']],
  ['medicine_cabinet', ['medicine']],
  ['central', ['feed', 'care', 'medicine', 'unknown-expiry']],
])('transfer destination %s filters incompatible or expired/empty stock', (type, expected) => {
  expect(
    inventoryOptions(
      op('transfers.create'),
      'balanceId',
      rows,
      { destinationWarehouseId: id },
      { type },
    ).map((row) => row._id),
  ).toEqual(expected);
});
test('no selected destination yields no selectable balances; source cannot also be destination', () => {
  expect(inventoryOptions(op('transfers.create'), 'balanceId', rows, {}, undefined)).toEqual([]);
  expect(
    inventoryOptions(
      op('transfers.create'),
      'destinationWarehouseId',
      [
        { _id: id, isActive: true },
        { _id: other, isActive: true },
        { _id: third, isActive: false },
      ],
      { sourceWarehouseId: id },
    ).map((row) => row._id),
  ).toEqual([other]);
});
test('external receipts only select central warehouses', () => {
  expect(
    inventoryOptions(
      op('receipts.create'),
      'warehouseId',
      [
        { _id: id, type: 'central' },
        { _id: other, type: 'stable' },
      ],
      {},
    ).map((row) => row._id),
  ).toEqual([id]);
});
test('replenishment selector works with category-scoped backend options that omit category', () => {
  const backendOptions = [{ _id: id, name: 'Thuốc', strength: '10mg', dosageForm: 'Viên' }];
  expect(
    inventoryOptions(
      op('replenishments.create'),
      'itemId',
      backendOptions,
      { warehouseId: other },
      { type: 'medicine_cabinet' },
    ),
  ).toHaveLength(1);
  expect(
    inventoryOptions(op('replenishments.create'), 'itemId', backendOptions, {}, undefined),
  ).toHaveLength(0);
});
test('warehouse detail scans authorized pages and does not call a nonexistent GET id route', async () => {
  const calls: number[] = [];
  apiClient.defaults.adapter = async (config) => {
    expect(config.url).toBe('/inventory/warehouses');
    calls.push(config.params.page);
    return {
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: {
        success: true,
        data: {
          warehouses: [
            {
              _id: config.params.page === 1 ? other : id,
              name: 'Kho phụ',
              type: 'stable',
              isActive: true,
              assignedGroomIds: [],
            },
          ],
          pagination: { page: config.params.page, totalPages: 2, total: 101, limit: 100 },
        },
      },
    };
  };
  expect((await inventoryApi.warehouse(id))._id).toBe(id);
  expect(calls).toEqual([1, 2]);
});
test('feed forecast uses the dedicated authorized endpoint and accepts empty state', async () => {
  apiClient.defaults.adapter = async (config) => {
    expect(config.url).toBe('/inventory/feed-forecast');
    return {
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { success: true, data: { day: '2026-11-19', days: 7, areas: [], summaryItems: [] } },
    };
  };
  expect((await feedForecastApi.get()).summaryItems).toEqual([]);
});
