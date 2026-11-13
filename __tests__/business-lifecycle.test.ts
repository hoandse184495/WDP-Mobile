import { findOperation, allowedOperation } from '@/features/operations/contracts/registry';
import {
  operationInitial,
  operationSchema,
  operationErrors,
} from '@/features/operations/contracts/business-rules';
import { incidentTransitions } from '@/features/incidents/utils/lifecycle';
const op = (id: string) => findOperation(id)!;
const id = 'a'.repeat(24);
const other = 'b'.repeat(24);
jest.mock('expo-crypto', () => ({ randomUUID: () => 'cda00244-3891-4280-a34c-dea21e0b0930' }));

test('health closure follows the updated backend and always requires a handling note', () => {
  const waiting = { status: 'acknowledged', requiresVetReview: true, horseId: id };
  expect(incidentTransitions(waiting)).toEqual(['closed']);
  expect(allowedOperation(op('incidents.status'), 'club_manager', waiting, id)).toBe(true);
  expect(incidentTransitions({ ...waiting, status: 'pending_review' })).toEqual(['closed']);
  const reviewed = { ...waiting, status: 'pending_review', medicalRecordId: other, revision: 3 };
  expect(allowedOperation(op('incidents.status'), 'club_manager', reviewed, id)).toBe(true);
  expect(operationInitial(op('incidents.status'), reviewed).status).toBe('closed');
  expect(
    operationErrors(
      op('incidents.status'),
      { revision: 3, status: 'closed', note: 'Đã xử lý và ghi nhận kết quả' },
      false,
      reviewed,
    ),
  ).toEqual([]);
});
test('open reports support acknowledge or close and closing requires a public handling note', () => {
  const open = { status: 'open', requiresVetReview: false, revision: 1 };
  expect(operationSchema(op('incidents.status'), open).properties?.status.enum).toEqual([
    'acknowledged',
    'closed',
  ]);
  expect(
    operationErrors(
      op('incidents.status'),
      { revision: 1, status: 'closed', note: 'Handled' },
      false,
      open,
    ),
  ).toEqual([]);
  const processing = { ...open, status: 'acknowledged' };
  expect(
    operationErrors(
      op('incidents.status'),
      { revision: 1, status: 'closed', note: '' },
      false,
      processing,
    ),
  ).not.toEqual([]);
  expect(
    operationErrors(
      op('incidents.status'),
      { revision: 1, status: 'closed', note: 'Đã xử lý' },
      false,
      processing,
    ),
  ).toEqual([]);
});
test('Vet can claim unassigned health reports at both priorities', () => {
  const report = { status: 'open', requiresVetReview: true, horseId: id, priority: 'urgent' };
  expect(allowedOperation(op('incidents.claim'), 'veterinarian', report, id)).toBe(true);
  expect(
    allowedOperation(op('incidents.claim'), 'veterinarian', { ...report, priority: 'normal' }, id),
  ).toBe(true);
  expect(
    allowedOperation(
      op('incidents.claim'),
      'veterinarian',
      { ...report, assignedVet: { _id: other } },
      id,
    ),
  ).toBe(false);
  expect(
    allowedOperation(
      op('incidents.assign'),
      'club_manager',
      { ...report, requiresVetReview: false },
      id,
    ),
  ).toBe(false);
});
test.each([
  ['admissions.groom', 'groom', 'pending_groom', 'assignedGroomId'],
  ['admissions.vet', 'veterinarian', 'pending_vet', 'assignedVetId'],
  ['admissions.trainer', 'head_trainer', 'pending_trainer', 'assignedTrainerId'],
] as const)('%s requires current reviewer assignment', (name, role, status, field) => {
  expect(allowedOperation(op(name), role, { status }, id)).toBe(false);
  expect(allowedOperation(op(name), role, { status, [field]: other }, id)).toBe(false);
  expect(allowedOperation(op(name), role, { status, [field]: { _id: id } }, id)).toBe(true);
});
