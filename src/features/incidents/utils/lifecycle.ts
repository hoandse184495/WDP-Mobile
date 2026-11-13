import { entityId, type JsonRecord } from '@/features/operations/types/operation';

export function healthIncident(record: JsonRecord) {
  return record.domain
    ? record.domain === 'health'
    : ['horse_health', 'not_eating', 'unusual_behavior', 'hoof_issue'].includes(
        String(record.category),
      ) || record.requiresVetReview === true;
}
export function canHandleIncident(record: JsonRecord, role: string) {
  return (
    role === 'club_manager' ||
    (healthIncident(record) ? role === 'veterinarian' : role === 'head_trainer')
  );
}
export function incidentTransitions(record: JsonRecord): ('acknowledged' | 'closed')[] {
  if (record.status === 'open') return ['acknowledged', 'closed'];
  return ['acknowledged', 'in_progress', 'pending_review'].includes(String(record.status))
    ? ['closed']
    : [];
}

/** Mirrors the backend's record linking checks; the server remains authoritative. */
export function eligibleIncidentRecord(
  record: JsonRecord,
  incident: JsonRecord,
  vetId: string,
  now = Date.now(),
) {
  const examined = Date.parse(String(record.examinationDate)),
    observed = Date.parse(String(incident.observedAt));
  return Boolean(
    entityId(record.horseId) &&
    entityId(record.horseId) === entityId(incident.horseId) &&
    entityId(record.veterinarianId) === vetId &&
    String(record.diagnosis ?? '').trim() &&
    Number.isFinite(examined) &&
    Number.isFinite(observed) &&
    examined <= now &&
    Math.floor(examined / 60000) >= Math.floor(observed / 60000) &&
    (!entityId(record.incidentReportId) ||
      entityId(record.incidentReportId) === entityId(incident)),
  );
}
