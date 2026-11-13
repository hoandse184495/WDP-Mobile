import { apiClient } from '@/core/network/api-client';
import { environment } from '@/core/config/environment';
import { AppError } from '@/core/errors/app-error';
import { horseApi } from '@/features/horses/api/horse-api';
import { dossierApi } from '@/features/horses/api/health-dossier-api';
import {
  dossierSchema,
  clinicalScheduleSchema,
  clinicalRoles,
} from '@/features/horses/types/health-dossier';
import { cabinetApi } from '@/features/inventory/api/medicine-cabinet-api';
import { operationsApi } from '@/features/operations/api/operations-api';
import { findOperation, allowedOperation } from '@/features/operations/contracts/registry';
import {
  operationInitial,
  operationErrors,
  prepareOperation,
} from '@/features/operations/contracts/business-rules';
import { allRoles } from '@/core/constants/roles';
import { clubDate, shiftDay } from '@/core/utils/date';
import { type JsonRecord, asRecord } from '@/features/operations/types/operation';
import { navigationGroups } from '@/features/home/config/workspaces';
import { referenceSource } from '@/features/operations/hooks/use-reference-options';
jest.mock('@/features/horses/api/horse-api', () => ({ horseApi: { detail: jest.fn() } }));
jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));
const id = 'a'.repeat(24),
  itemId = 'b'.repeat(24),
  warehouseId = 'c'.repeat(24),
  lineId = 'd'.repeat(24);
const op = (name: string) => findOperation(name)!;
const cabinet = {
  warehouse: { _id: warehouseId, name: 'Tủ thú y', stockVersion: 7 },
  items: [
    {
      _id: itemId,
      name: 'Sản phẩm A',
      code: 'MED-01',
      unit: 'ml',
      strength: 'Hàm lượng',
      dosageForm: 'Dung dịch',
      available: 10,
      lots: [{ code: 'L-01', expiresOn: shiftDay(clubDate(), 180), quantity: 10 }],
    },
  ],
};
const dossier = () => ({
  restricted: false,
  today: clubDate(),
  horse: { _id: id, name: 'Thanh Phong', registrationCode: 'AP-206' },
  records: [
    {
      _id: 'record',
      examinationDate: '2026-11-10T01:00:00Z',
      diagnosis: 'Đã khám',
      temperature: 0,
      issues: [
        { _id: 'issue', number: 'PX-01', lines: [{ name: 'Sản phẩm A', quantity: 0, unit: 'ml' }] },
      ],
    },
  ],
  schedules: [],
  injuries: [],
});
beforeEach(() => {
  jest.clearAllMocks();
  environment.apiUrl = 'http://10.0.2.2:3000/api';
  jest.mocked(horseApi.detail).mockResolvedValue({ _id: id } as never);
});
const adapter = (data: unknown) => {
  const calls: string[] = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config.url!);
    return { config, status: 200, statusText: 'OK', headers: {}, data: { success: true, data } };
  };
  return calls;
};

test('health dossier verifies scoped horse first, forwards cancellation and preserves zero quantities', async () => {
  const calls = adapter(dossier()),
    controller = new AbortController();
  const data = await dossierApi.get(id, controller.signal);
  expect(horseApi.detail).toHaveBeenCalledWith(id, controller.signal);
  expect(calls).toEqual(['/horses/' + id + '/health-dossier']);
  expect(data.records[0].temperature).toBe(0);
  expect(data.records[0].issues[0].lines[0].quantity).toBe(0);
});
test('failed scope lookup never fetches the clinical feed', async () => {
  const calls = adapter(dossier());
  jest.mocked(horseApi.detail).mockRejectedValue(new AppError('Không có quyền'));
  await expect(dossierApi.get(id)).rejects.toThrow('Không có quyền');
  expect(calls).toEqual([]);
});
test('mismatched dossier is rejected and restricted feed never leaks returned clinical arrays', async () => {
  adapter({ ...dossier(), horse: { ...dossier().horse, _id: itemId } });
  await expect(dossierApi.get(id)).rejects.toThrow('không khớp');
  adapter({ ...dossier(), restricted: true, restrictionReason: 'Chưa tiếp nhận' });
  expect((await dossierApi.get(id)).records).toEqual([]);
});
test('dossier schema keeps administration, dispensing and linked records', () => {
  const care = clinicalScheduleSchema.parse({
    _id: 'care',
    title: 'Tiêm phòng',
    type: 'vaccination',
    dueDate: clubDate(),
    status: 'completed',
    administration: {
      performedOn: clubDate(),
      productName: 'Sản phẩm A',
      dose: 'Theo chỉ định',
      lotNumber: 'L-01',
      reaction: 'Không',
    },
    nextDueDate: shiftDay(clubDate(), 30),
    medicineIssue: dossier().records[0].issues[0],
    linkedRecord: dossier().records[0],
  });
  expect(care.administration?.lotNumber).toBe('L-01');
  expect(care.medicineIssue?.lines[0].quantity).toBe(0);
  expect(care.linkedRecord?.diagnosis).toBe('Đã khám');
  expect(dossierSchema.parse(dossier()).records).toHaveLength(1);
});
test.each(allRoles)('%s sees only permitted clinical and cabinet destinations', (role) => {
  const keys = navigationGroups(role).flatMap((group) => group.items.map((item) => item.key));
  expect(keys.includes('medicineCabinet')).toBe(
    ['club_manager', 'veterinarian', 'warehouse_keeper'].includes(role),
  );
  expect((clinicalRoles as readonly string[]).includes(role)).toBe(
    ['club_manager', 'veterinarian', 'horse_owner'].includes(role),
  );
});
test('cabinet adapter preserves stock version and limited eligible stock', async () => {
  const calls = adapter(cabinet);
  expect(await cabinetApi.get()).toEqual(cabinet);
  expect(calls).toEqual(['/prescriptions/cabinet']);
});
const careContext = (): JsonRecord => ({
  _id: id,
  type: 'vaccination',
  dueDate: clubDate(),
  status: 'scheduled',
  revision: 2,
  repeatDays: 30,
  _cabinet: cabinet,
});
const careBody = () => {
  const context = careContext(),
    initial = operationInitial(op('schedules.complete'), context);
  return prepareOperation(op('schedules.complete'), {
    ...initial,
    result: 'Đã thực hiện',
    administration: {
      ...asRecord(initial.administration),
      productName: 'Sản phẩm A',
      dose: 'Theo chỉ định',
    },
    stockIssue: { ...asRecord(initial.stockIssue), itemId, quantity: '2' },
  });
};
test('medication care initializes cabinet version and normalizes quantity', () => {
  const body = careBody();
  expect(body.stockIssue).toEqual({ warehouseId, stockVersion: 7, itemId, quantity: 2 });
  expect(body.nextDueDate).toBe(shiftDay(clubDate(), 30));
  expect(operationErrors(op('schedules.complete'), body, false, careContext())).toEqual([]);
});
test('medication care rejects missing stock, stale version, excess stock and invalid dates', () => {
  const context = careContext(),
    body = careBody();
  expect(
    operationErrors(op('schedules.complete'), { revision: 2, result: 'Đã làm' }, false, context),
  ).toContain('Chọn thuốc từ tủ, nhập liều và ngày thực hiện.');
  for (const patch of [{ stockVersion: 6 }, { quantity: 11 }, { itemId: 'missing' }])
    expect(
      operationErrors(
        op('schedules.complete'),
        { ...body, stockIssue: { ...asRecord(body.stockIssue), ...patch } },
        false,
        context,
      ).length,
    ).toBeGreaterThan(0);
  expect(
    operationErrors(op('schedules.complete'), { ...body, nextDueDate: clubDate() }, false, context),
  ).toContain('Ngày hẹn tiếp theo phải sau ngày thực hiện và từ hôm nay trở đi.');
  expect(
    operationErrors(
      op('schedules.complete'),
      {
        ...body,
        administration: { ...asRecord(body.administration), performedOn: shiftDay(clubDate(), 1) },
      },
      false,
      context,
    ),
  ).toContain('Ngày thực hiện phải từ ngày hẹn đến hôm nay.');
});
test('prescriptions fill exactly the full remaining quantity and reject a partial handover', () => {
  const context = {
    revision: 1,
    warehouseId,
    stockVersion: 7,
    previewHash: 'f'.repeat(64),
    lines: [
      { _id: lineId, quantity: 10, supplied: 2, remaining: 8 },
      { _id: itemId, quantity: 2, supplied: 2, remaining: 0 },
    ],
  };
  const body = prepareOperation(op('prescriptions.issue'), {
    ...operationInitial(op('prescriptions.issue'), context),
    physicallyHandedOver: true,
    note: 'Đã bàn giao thuốc',
  });
  expect(body.lines).toEqual([{ lineId, quantity: 8 }]);
  expect(operationErrors(op('prescriptions.issue'), body, false, context)).toEqual([]);
  expect(
    operationErrors(
      op('prescriptions.issue'),
      { ...body, lines: [{ lineId, quantity: 3 }] },
      false,
      context,
    ),
  ).toContain('Cần xuất đủ toàn bộ lượng còn lại của đơn trong một lần.');
  expect(
    allowedOperation(
      op('prescriptions.issue'),
      'veterinarian',
      { prescription: { status: 'waiting' }, veterinarian: { _id: id } },
      id,
    ),
  ).toBe(true);
});
test('cabinet creation gets vets from authorized inventory options and removes irrelevant references', () => {
  expect(
    referenceSource(
      op('warehouses.create'),
      'responsibleVetId',
      'warehouse_keeper',
      'responsibleVetId',
    ),
  ).toEqual({ path: '/inventory/options', key: 'vets' });
  expect(
    prepareOperation(op('warehouses.create'), {
      type: 'central',
      stableId: id,
      responsibleVetId: id,
    }),
  ).not.toHaveProperty('responsibleVetId');
  expect(operationErrors(op('warehouses.create'), { type: 'medicine_cabinet' })).toContain(
    'Tủ thuốc cần chọn bác sĩ phụ trách chính.',
  );
});
test.each(allRoles)('%s can handle only its incident domain', (role) => {
  const health = { status: 'open', domain: 'health', horseId: id },
    operational = { status: 'open', domain: 'operations' };
  expect(allowedOperation(op('incidents.claim'), role, health, id)).toBe(
    ['club_manager', 'veterinarian'].includes(role),
  );
  expect(allowedOperation(op('incidents.claim'), role, operational, id)).toBe(
    ['club_manager', 'head_trainer'].includes(role),
  );
  expect(allowedOperation(op('incidents.status'), role, operational, id)).toBe(
    ['club_manager', 'head_trainer'].includes(role),
  );
  expect(
    allowedOperation(
      op('incidents.claim'),
      role,
      { ...operational, assignedTo: { _id: itemId } },
      id,
    ),
  ).toBe(false);
});

test('medical care context loads a fresh cabinet snapshot before initializing the form', async () => {
  const calls: string[] = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config.url!);
    return {
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: {
        success: true,
        data:
          config.url === '/prescriptions/cabinet'
            ? cabinet
            : { ...careContext(), _cabinet: undefined },
      },
    };
  };
  const context = await operationsApi.context(op('schedules.complete'), id);
  expect(calls).toEqual(['/medical-schedules/' + id, '/prescriptions/cabinet']);
  expect(
    asRecord(operationInitial(op('schedules.complete'), context).stockIssue).stockVersion,
  ).toBe(7);
});
