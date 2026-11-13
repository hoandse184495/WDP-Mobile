import { Role } from '@/core/constants/roles';
import { admissionOperations } from '@/features/admissions/operations';
import { medicalOperations } from '@/features/medical/operations';
import { inventoryOperations } from '@/features/inventory/operations';
import { stableOperations } from '@/features/stables/operations';
import { workOperations } from './work-operations';
import { Operation, JsonRecord, entityId, asRecord } from '../types/operation';
import {
  incidentTransitions,
  healthIncident,
  canHandleIncident,
} from '@/features/incidents/utils/lifecycle';
export const operations: Operation[] = [
  ...admissionOperations,
  ...medicalOperations,
  ...inventoryOperations,
  ...stableOperations,
  ...workOperations,
];
export const findOperation = (id: string) => operations.find((operation) => operation.id === id);
export function allowedOperation(
  operation: Operation,
  role: Role,
  record?: JsonRecord,
  userId?: string,
) {
  if (!operation.roles.includes(role) || (operation.scope === 'record' && !record)) return false;
  const status = String(
    asRecord(record?.prescription).status ?? record?.displayStatus ?? record?.status ?? '',
  );
  if (operation.statuses && !operation.statuses.includes(status)) return false;
  if (
    operation.module === 'team' &&
    ['team.deactivate', 'team.reset-password'].includes(operation.id) &&
    record?._id === userId
  )
    return false;
  if (
    (operation.id === 'team.deactivate' && record?.isActive === false) ||
    (operation.id === 'team.reactivate' && record?.isActive !== false)
  )
    return false;
  if (operation.id === 'prescriptions.create' && record?.prescription) return false;
  if (operation.id === 'horses.emergency-lock' && record?.isTrainingLocked) return false;
  if (operation.id === 'horses.emergency-unlock' && !record?.isTrainingLocked) return false;
  if (operation.module === 'admissions') {
    const assigned =
      operation.id === 'admissions.groom'
        ? record?.assignedGroomId
        : operation.id === 'admissions.vet'
          ? record?.assignedVetId
          : operation.id === 'admissions.trainer'
            ? record?.assignedTrainerId
            : null;
    if (
      ['admissions.groom', 'admissions.vet', 'admissions.trainer'].includes(operation.id) &&
      entityId(assigned) !== userId
    )
      return false;
  }
  if (operation.id === 'sessions.notes' && entityId(record?.groomId) !== userId) return false;
  if (operation.id.startsWith('tasks.telemetry') && record?.type !== 'training') return false;
  if (operation.id === 'tasks.checkpoint' && record?.type !== 'medical_support') return false;
  if (operation.id === 'tasks.edit' && record?.medicalScheduleId) return false;
  if (operation.id === 'schedules.encounter' && record?.type !== 'follow_up') return false;
  if (['schedules.complete', 'schedules.encounter'].includes(operation.id)) {
    const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
    if (String(record?.dueDate ?? '') > today) return false;
    if (
      operation.id === 'schedules.complete' &&
      record?.type === 'follow_up' &&
      !entityId(record.medicalRecordId)
    )
      return false;
  }
  if (
    operation.module === 'incidents' &&
    ['incidents.encounter', 'incidents.link'].includes(operation.id) &&
    entityId(record?.assignedVet) !== userId
  )
    return false;
  if (operation.id === 'incidents.status' && !incidentTransitions(record ?? {}).length)
    return false;
  if (operation.id === 'incidents.status' && !canHandleIncident(record ?? {}, role)) return false;
  if (operation.id === 'incidents.assign' && (!healthIncident(record ?? {}) || !record?.horseId))
    return false;
  if (
    operation.id === 'incidents.claim' &&
    (!canHandleIncident(record ?? {}, role) || entityId(record?.assignedTo ?? record?.assignedVet))
  )
    return false;
  if (
    operation.module === 'tasks' &&
    operation.roles.length === 1 &&
    role === 'groom' &&
    entityId(record?.groomId) !== userId
  )
    return false;
  if (
    operation.module === 'rations' &&
    ['rations.submit', 'rations.direct'].includes(operation.id) &&
    record?.authorId &&
    entityId(record.authorId) !== userId
  )
    return false;
  if (
    operation.module === 'prescriptions' &&
    role === 'veterinarian' &&
    record?.veterinarian &&
    entityId(record.veterinarian) !== userId
  )
    return false;
  if (
    operation.id === 'stocktakes.save' ||
    operation.id === 'stocktakes.start' ||
    operation.id === 'stocktakes.submit'
  ) {
    const counter = record?.counter ?? record?.counterId;
    if (counter && entityId(counter) !== userId) return false;
  }
  return true;
}
