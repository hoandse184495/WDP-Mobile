jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { clubDate, shiftDay } from '@/core/utils/date';
import { allRoles } from '@/core/constants/roles';
import { findOperation, allowedOperation } from '@/features/operations/contracts/registry';
import {
  operationInitial,
  prepareOperation,
  operationErrors,
} from '@/features/operations/contracts/business-rules';
import { initialValue, schemaFor } from '@/features/operations/contracts/schema';
import { asRecord, type JsonRecord } from '@/features/operations/types/operation';
import { referenceSource } from '@/features/operations/hooks/use-reference-options';
import { eligibleIncidentRecord } from '@/features/incidents/utils/lifecycle';

const id = 'a'.repeat(24),
  other = 'b'.repeat(24);
const op = (name: string) => findOperation(name)!;
const ration = (): JsonRecord => {
  const initial = operationInitial(op('rations.create'), {});
  const meal = asRecord((initial.meals as unknown[])[0]);
  return prepareOperation(op('rations.create'), {
    ...initial,
    horseId: id,
    title: 'Khẩu phần duy trì thể lực',
    objective: 'Duy trì thể lực trong giai đoạn nghỉ',
    meals: [{ ...meal, lines: [{ itemId: id, quantity: 2 }] }],
  });
};

test.each(allRoles)('%s ration editing controls match the current web roles', (role) => {
  const canManage = ['club_manager', 'head_trainer'].includes(role);
  expect(allowedOperation(op('rations.create'), role)).toBe(canManage);
  expect(
    allowedOperation(op('rations.edit'), role, { status: 'approved', authorId: other }, id),
  ).toBe(canManage);
  expect(
    allowedOperation(op('rations.withdraw'), role, { status: 'approved', authorId: other }, id),
  ).toBe(canManage);
});

test('ration defaults include valid dates and a hidden generated meal key accepted by the actual backend', () => {
  const body = ration();
  expect(body.validFrom).toBe(clubDate());
  expect(body.validTo).toBe(shiftDay(clubDate(), 7));
  expect(asRecord((body.meals as unknown[])[0]).key).toMatch(/^meal_[a-f0-9]{8}$/);
  expect(operationErrors(op('rations.create'), body)).toEqual([]);
  const backend = resolve(process.cwd(), '../../Racehorse-_Training-Management_System_BE');
  const probe = spawnSync(
    process.execPath,
    [
      '-e',
      "const fs=require('fs'); const result=require('./src/utils/ration.schema').create.safeParse(JSON.parse(fs.readFileSync(0,'utf8'))); if(!result.success){console.error(result.error.message); process.exit(1)}",
    ],
    {
      cwd: backend,
      input: JSON.stringify(body),
      encoding: 'utf8',
      timeout: 20000,
    },
  );
  expect({ status: probe.status, error: probe.stderr }).toEqual({ status: 0, error: '' });
});

test('existing meal keys survive editing and added meals get different keys', () => {
  const rule = schemaFor('ration.create').properties!.meals.items;
  if (!rule || typeof rule !== 'object') throw new Error('Missing meal contract');
  const existing = asRecord(
    initialValue(rule, { key: 'bua_sang', name: 'Sáng', time: '07:00', lines: [] }),
  );
  const added = asRecord(initialValue(rule));
  const second = asRecord(initialValue(rule));
  expect(existing.key).toBe('bua_sang');
  expect(added.key).not.toBe(second.key);
  expect(added.key).toMatch(/^[a-z][a-z0-9_-]{0,29}$/);
});

test('rations use backend options scoped to active horses and feed items', () => {
  expect(referenceSource(op('rations.create'), 'horseId', 'club_manager', 'horseId')).toEqual({
    path: '/rations/options',
    key: 'horses',
  });
  expect(
    referenceSource(op('rations.create'), 'itemId', 'club_manager', 'meals.0.lines.0.itemId'),
  ).toEqual({ path: '/rations/options', key: 'items' });
});

test('duplicate ingredients and unsupported precision are rejected before submission', () => {
  const body = ration(),
    meal = asRecord((body.meals as unknown[])[0]);
  body.meals = [
    {
      ...meal,
      lines: [
        { itemId: id, quantity: 2.1234 },
        { itemId: id, quantity: 1 },
      ],
    },
  ];
  expect(operationErrors(op('rations.create'), body)).toEqual(
    expect.arrayContaining([
      'Không lặp vật tư trong cùng một bữa ăn.',
      'Lượng thức ăn chỉ nhận tối đa 3 chữ số thập phân.',
    ]),
  );
});

const schedule = () => ({
  ...operationInitial(op('schedules.create'), {}),
  horseId: id,
  type: 'follow_up',
  title: 'Theo dõi tái khám',
});
test('medical scheduling accepts an unslotted appointment and resets follow-up repetition', () => {
  const body = prepareOperation(op('schedules.create'), { ...schedule(), repeatDays: 5 });
  expect(body).toMatchObject({
    autoCoordinate: true,
    repeatDays: 0,
    prepareMinutes: 0,
    returnMinutes: 0,
  });
  expect(operationErrors(op('schedules.create'), body)).toEqual([]);
  const partial = { ...body, startTime: '09:00' };
  expect(operationErrors(op('schedules.create'), partial)).toEqual([]);
  expect(
    operationErrors(op('schedules.create'), {
      ...partial,
      endTime: '08:00',
      location: 'Phòng khám',
    }),
  ).toContain('Giờ kết thúc khám phải sau giờ bắt đầu.');
});

test('future schedules cannot complete and follow-up completion needs a linked record', () => {
  const row = { status: 'scheduled', type: 'follow_up', dueDate: shiftDay(clubDate(), 1) };
  expect(allowedOperation(op('schedules.encounter'), 'veterinarian', row, id)).toBe(false);
  expect(
    allowedOperation(op('schedules.complete'), 'veterinarian', { ...row, dueDate: clubDate() }, id),
  ).toBe(false);
  expect(
    allowedOperation(
      op('schedules.complete'),
      'veterinarian',
      { ...row, dueDate: clubDate(), medicalRecordId: other },
      id,
    ),
  ).toBe(true);
});

test('clinical links require same horse, author, minute, diagnosis and no other incident', () => {
  const incident = { _id: 'report', horseId: id, observedAt: '2026-11-10T08:00:59Z' };
  const record = {
    horseId: { _id: id },
    veterinarianId: id,
    diagnosis: 'Đã khám',
    examinationDate: '2026-11-10T08:00:00Z',
  };
  const now = Date.parse('2026-11-10T09:00:00Z');
  expect(eligibleIncidentRecord(record, incident, id, now)).toBe(true);
  for (const patch of [
    { horseId: other },
    { veterinarianId: other },
    { diagnosis: '' },
    { examinationDate: '2026-11-10T07:59:59Z' },
    { examinationDate: '2026-11-10T10:00:00Z' },
    { examinationDate: 'invalid' },
    { incidentReportId: 'different' },
  ])
    expect(eligibleIncidentRecord({ ...record, ...patch }, incident, id, now)).toBe(false);
});
