import type { ClinicalRecord, ClinicalSchedule } from '../types/health-dossier';
import type { CareJournal, JournalTask, JournalSession } from '../types/care-journal';
export const journalCategories = [
  { value: 'all', label: 'Tất cả hoạt động' },
  { value: 'nutrition', label: 'Bữa ăn' },
  { value: 'training', label: 'Huấn luyện' },
  { value: 'stable', label: 'Chăm sóc và chuồng' },
  { value: 'health', label: 'Chăm sóc y tế' },
] as const;
export type JournalCategory = (typeof journalCategories)[number]['value'];
export type JournalEntry = { id: string; time?: string | null; category: JournalCategory } & (
  | { kind: 'task'; record: JournalTask }
  | { kind: 'session'; record: JournalSession }
  | { kind: 'clinical'; record: ClinicalRecord }
  | { kind: 'care'; record: ClinicalSchedule }
);
export const categoryForTask = (type: string): JournalCategory =>
  type === 'feeding'
    ? 'nutrition'
    : type === 'training'
      ? 'training'
      : type === 'medical_support'
        ? 'health'
        : 'stable';
export function journalTimeline(
  journal: CareJournal,
  category: JournalCategory = 'all',
): JournalEntry[] {
  const tasks: JournalEntry[] = journal.tasks.map((record) => ({
    id: 'task-' + record._id,
    time: record.actualEndAt || record.actualStartAt || record.scheduledStartAt,
    category: categoryForTask(record.type),
    kind: 'task',
    record,
  }));
  const sessions: JournalEntry[] = journal.sessions.map((record) => ({
    id: 'session-' + record._id,
    time: record.sessionDate,
    category: 'training',
    kind: 'session',
    record,
  }));
  const time = (value?: string | null) =>
    value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
  const clinical: JournalEntry[] = journal.medicalRecords.map((record) => ({
    id: 'clinical-' + record._id,
    time: record.examinationDate,
    category: 'health',
    kind: 'clinical',
    record,
  }));
  const care: JournalEntry[] = journal.medicalSchedules.map((record) => ({
    id: 'care-' + record._id,
    time:
      record.completedAt ||
      (record.administration?.performedOn || record.dueDate) + 'T00:00:00+07:00',
    category: 'health',
    kind: 'care',
    record,
  }));
  return [...tasks, ...sessions, ...clinical, ...care]
    .filter((row) => category === 'all' || row.category === category)
    .sort((a, b) => time(b.time) - time(a.time) || a.id.localeCompare(b.id));
}
export function validJournalDay(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + 'T12:00:00Z')) &&
    new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value
  );
}
export function journalPhotoUrl(value?: string | null) {
  try {
    const url = new URL(value ?? '');
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
export function illustrationPhoto(value?: string | null) {
  try {
    return new URL(value ?? '').hostname === 'images.unsplash.com';
  } catch {
    return false;
  }
}
export function journalStamp(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Chưa ghi nhận';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
