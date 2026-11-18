import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { apiClient, setApiToken } from '@/core/network/api-client';
import { environment } from '@/core/config/environment';
import { queryClient } from '@/core/network/query-client';
import {
  operations,
  allowedOperation,
  findOperation,
} from '@/features/operations/contracts/registry';
import { schemaFor, initialValue, validateInput } from '@/features/operations/contracts/schema';
import {
  operationErrors,
  operationInitial,
  prepareOperation,
} from '@/features/operations/contracts/business-rules';
import { operationsApi, operationPath } from '@/features/operations/api/operations-api';
import { allRoles } from '@/core/constants/roles';
import { workspaceApi } from '@/features/workspace/api/workspace-api';
import { scheduledTask, scheduleApi } from '@/features/tasks/api/schedule-api';
import { ScheduleInput } from '@/features/tasks/schemas/schedule-schema';
jest.mock('expo-crypto', () => ({ randomUUID: () => 'cda00244-3891-4280-a34c-dea21e0b0930' }));
const id = 'a'.repeat(24),
  other = 'b'.repeat(24);
const op = (name: string) => {
  const found = findOperation(name);
  if (!found) throw Error(name);
  return found;
};
const ok = (config: InternalAxiosRequestConfig, data: unknown) => ({
  config,
  status: 200,
  statusText: 'OK',
  headers: {},
  data: { success: true, data },
});
beforeEach(() => {
  queryClient.clear();
  setApiToken(null);
  environment.apiUrl = 'http://10.0.2.2:3000/api';
});
afterEach(() => queryClient.clear());
test('every registered operation has a contract and explicitly bounded roles', () => {
  expect(new Set(operations.map((row) => row.id)).size).toBe(operations.length);
  for (const row of operations) {
    expect(schemaFor(row.contract)).toBeDefined();
    expect(row.roles.length).toBeGreaterThan(0);
    expect(row.roles.every((role) => allRoles.includes(role))).toBe(true);
  }
});
test('warehouse keeper has stock writes but cannot edit horse or personnel data', () => {
  expect(allowedOperation(op('items.create'), 'warehouse_keeper')).toBe(true);
  expect(allowedOperation(op('items.create'), 'club_manager')).toBe(false);
  expect(allowedOperation(op('horses.archive'), 'warehouse_keeper', { _id: id })).toBe(false);
  expect(allowedOperation(op('team.create'), 'warehouse_keeper')).toBe(false);
});
test('clinical assignment, medical support and counting actions are scoped to assigned staff', () => {
  expect(
    allowedOperation(
      op('incidents.encounter'),
      'veterinarian',
      { status: 'in_progress', assignedVet: { _id: other } },
      id,
    ),
  ).toBe(false);
  expect(findOperation('tasks.checkpoint')).toBeUndefined();
  expect(
    allowedOperation(
      op('tasks.edit'),
      'club_manager',
      { status: 'scheduled', medicalScheduleId: id },
      id,
    ),
  ).toBe(false);
  expect(
    allowedOperation(
      op('stocktakes.save'),
      'groom',
      { status: 'counting', counter: { _id: other } },
      id,
    ),
  ).toBe(false);
});
test('physical handover and warehouse freeze are never pre-acknowledged', () => {
  const issue = operationInitial(op('prescriptions.issue'), {
    revision: 4,
    warehouseId: id,
    stockVersion: 12,
    previewHash: 'f'.repeat(64),
    lines: [{ _id: other, quantity: 8 }],
  });
  expect(issue.physicallyHandedOver).toBe(false);
  expect((issue.lines as Record<string, unknown>[])[0].quantity).toBe(8);
  expect(
    operationErrors(op('prescriptions.issue'), prepareOperation(op('prescriptions.issue'), issue))
      .length,
  ).toBeGreaterThan(0);
  expect(operationInitial(op('stocktakes.start'), { revision: 2 }).acknowledgePhysicalFreeze).toBe(
    false,
  );
});
test('groom notes cannot carry protected measurement and trainer fields', () => {
  expect(
    prepareOperation(op('sessions.notes'), {
      groomNotes: 'Đã kiểm tra',
      maxSpeed: 20,
      performanceRating: 5,
      trainerNotes: 'forged',
      status: 'completed',
    }),
  ).toEqual({ groomNotes: 'Đã kiểm tra' });
});
test('nullable count is preserved rather than treated as zero', () => {
  const data = prepareOperation(op('stocktakes.save'), {
    revision: 5,
    countNotes: '',
    lines: [{ lineId: id, quantity: null, note: '' }],
  });
  expect(operationErrors(op('stocktakes.save'), data)).toEqual([]);
  expect((data.lines as Record<string, unknown>[])[0].quantity).toBeNull();
});
test('editing stock drafts maps populated warehouse names back to input identifiers', () => {
  const receipt = operationInitial(op('receipts.edit'), {
    warehouse: { _id: id, name: 'Kho chung' },
    revision: 5,
    lines: [{ itemId: other, quantity: 2, lotCode: 'LOT', expiresOn: null }],
  });
  expect(receipt.warehouseId).toBe(id);
  expect(receipt.lines).toEqual([{ itemId: other, quantity: 2, lotCode: 'LOT', expiresOn: null }]);
  const transfer = operationInitial(op('transfers.edit'), {
    sourceWarehouse: { _id: id },
    destinationWarehouse: { _id: other },
    revision: 4,
    lines: [],
  });
  expect(transfer).toMatchObject({
    sourceWarehouseId: id,
    destinationWarehouseId: other,
    revision: 4,
  });
});
test('follow-up defaults preserve schedule and injury versions', () => {
  const data = operationInitial(op('schedules.encounter'), {
    _id: id,
    revision: 9,
    horseId: { _id: other },
    _details: { initialInjuryIds: [other], injuries: [{ _id: other, __v: 7 }] },
  });
  expect(data.completeSchedule).toEqual({ id, revision: 9 });
  expect(data.injuries).toEqual([
    { mode: 'existing', id: other, expectedVersion: 7, observation: undefined, data: undefined },
  ]);
  expect(
    operationErrors(op('schedules.encounter'), prepareOperation(op('schedules.encounter'), data)),
  ).toContain('Kết thúc tái khám cần chọn loại Tái khám và nhập kết luận.');
});
test('rejects impossible quantities, calendar values and missing physical checks', () => {
  const schema = schemaFor('prescription.issue');
  expect(validateInput(schema, { revision: 0 }).length).toBeGreaterThan(0);
  expect(validateInput({ type: 'number', exclusiveMinimum: 0 }, 0).length).toBeGreaterThan(0);
  expect(initialValue({ type: 'boolean', const: true })).toBe(false);
  expect(() => operationPath('/horses/:id')).toThrow();
});
test('fresh prescription context supplies server revision, stock version and preview hash', async () => {
  apiClient.defaults.adapter = async (config) =>
    ok(config, {
      record: { _id: id, prescription: { status: 'waiting', revision: 4, lines: [] } },
      warehouse: { _id: other, stockVersion: 17 },
      previewHash: 'e'.repeat(64),
    });
  const context = await operationsApi.context(op('prescriptions.issue'), id);
  expect(context).toMatchObject({
    revision: 4,
    warehouseId: other,
    stockVersion: 17,
    previewHash: 'e'.repeat(64),
  });
});
test('editing a training task keeps the task revision and loads the current plan revision', async () => {
  apiClient.defaults.adapter = async (config) =>
    config.url === '/daily-tasks/options'
      ? ok(config, { plans: [{ _id: other, revision: 12 }] })
      : ok(config, {
          task: {
            _id: id,
            type: 'training',
            revision: 4,
            trainingPlanId: other,
            trainingExerciseKey: 'walk',
            groomId: other,
            title: 'Tập',
            scheduledStartAt: '2026-11-03T01:00:00Z',
            scheduledEndAt: '2026-11-03T02:00:00Z',
          },
        });
  const context = await operationsApi.context(op('tasks.edit'), id);
  const input = operationInitial(op('tasks.edit'), context);
  expect(input).toMatchObject({
    revision: 4,
    trainingPlanRevision: 12,
    trainingExerciseKey: 'walk',
  });
});
test('counting requests the selected page without loading the entire warehouse', async () => {
  apiClient.defaults.adapter = async (config) => {
    expect(config.params).toEqual({ page: 3, limit: 100 });
    return ok(config, {
      stocktake: { _id: id, revision: 3, lines: [], linePagination: { page: 3, totalPages: 5 } },
    });
  };
  const data = await operationsApi.context(op('stocktakes.save'), id, undefined, 3);
  expect(data.linePagination).toEqual({ page: 3, totalPages: 5 });
});
test('deletion accepts successful envelopes with no data, while conflicts remain failures', async () => {
  apiClient.defaults.adapter = async (config) => ({
    ...ok(config, undefined),
    data: { success: true, message: 'Archived' },
  });
  await expect(operationsApi.submit(op('horses.archive'), id, {})).resolves.toBeUndefined();
  apiClient.defaults.adapter = async (config) => {
    throw new AxiosError('Conflict', 'ERR_BAD_RESPONSE', config, undefined, {
      ...ok(config, {}),
      status: 409,
      data: { success: false, message: 'Hồ sơ vừa thay đổi' },
    });
  };
  await expect(operationsApi.submit(op('items.edit'), id, { revision: 0 })).rejects.toThrow(
    'Hồ sơ vừa thay đổi',
  );
});
test('workspace sends applied filters and keeps backend pagination', async () => {
  apiClient.defaults.adapter = async (config) => {
    expect(config.params).toMatchObject({ page: 2, status: 'partial', limit: 20 });
    return ok(config, {
      records: [],
      pagination: { page: 2, limit: 20, total: 30, totalPages: 2 },
    });
  };
  expect(
    (await workspaceApi.list('prescriptions', 2, undefined, undefined, { status: 'partial' }))
      .pagination.total,
  ).toBe(30);
});
test('single and batch schedules share UTC+7 mapping and a stable request key', async () => {
  const input: ScheduleInput = {
    title: 'Tập sáng',
    type: 'training',
    horseId: id,
    groomId: other,
    stallId: '',
    trainingPlanId: id,
    trainingExerciseKey: 'walk',
    rationPlanId: '',
    rationMealKey: '',
    start: '2026-11-03T08:00',
    end: '2026-11-03T09:00',
    instructions: '',
  };
  expect(scheduledTask(input, 'same-key', 7)).toMatchObject({
    scheduledStartAt: '2026-11-03T08:00:00+07:00',
    trainingPlanRevision: 7,
    requestKey: 'same-key',
  });
  apiClient.defaults.adapter = async (config) => {
    expect(config.url).toBe('/daily-tasks/batch/preview');
    expect(JSON.parse(config.data)).toMatchObject({
      task: { requestKey: 'same-key', trainingPlanRevision: 7 },
      dates: ['2026-11-03', '2026-11-04'],
    });
    return ok(config, { valid: true, rows: [] });
  };
  await expect(
    scheduleApi.previewBatch(input, ['2026-11-03', '2026-11-04'], 'same-key', 7),
  ).resolves.toMatchObject({ valid: true });
});
