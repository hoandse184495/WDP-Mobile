import { asRecord } from '@/features/operations/types/operation';
import { fieldLabel, choiceLabel } from '@/features/operations/contracts/labels';
import { formatDate, formatTime } from '@/core/utils/date';
const privateField = /password|secret|token|hash|^(?:path|bucket|url|.*Url|__v)$/i;
const labels: Record<string, string> = {
  distanceCompleted: 'Quãng đường (m)',
  durationMinutes: 'Thời lượng (phút)',
  avgSpeed: 'Tốc độ trung bình (m/s)',
  maxSpeed: 'Tốc độ tối đa (m/s)',
  avgHeartRate: 'Nhịp tim trung bình (bpm)',
  maxHeartRate: 'Nhịp tim tối đa (bpm)',
  performanceRating: 'Đánh giá / 5',
  fitnessScore: 'Điểm thể lực',
  trainerNotes: 'Nhận xét HLV',
  groomNotes: 'Ghi chú Groom',
  status: 'Trạng thái',
  alertTriggered: 'Có cảnh báo',
  alertType: 'Loại cảnh báo',
  alertMessage: 'Nội dung cảnh báo',
  actualStartAt: 'Bắt đầu thực tế',
  actualEndAt: 'Kết thúc thực tế',
  scheduledStartAt: 'Bắt đầu dự kiến',
  scheduledEndAt: 'Kết thúc dự kiến',
  title: 'Tên công việc',
  graceMinutes: 'Khoảng cho phép (phút)',
  affectedArea: 'Vùng ảnh hưởng',
  surfaceLocation: 'Vị trí chấn thương',
  treatmentPlan: 'Phác đồ điều trị',
  estimatedRecoveryDays: 'Dự kiến hồi phục (ngày)',
};
function safe(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(safe);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(asRecord(value))
        .filter(([key]) => !privateField.test(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, safe(child)]),
    );
  return value;
}
export function auditValue(key: string, value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'number') return value.toLocaleString('vi-VN');
  if (typeof value === 'string') {
    if (
      /(?:At|Date)$/.test(key) &&
      /^\d{4}-\d{2}-\d{2}/.test(value) &&
      Number.isFinite(Date.parse(value))
    )
      return formatDate(value) + ' ' + formatTime(value);
    return [
      'status',
      'alertType',
      'healthStatus',
      'severity',
      'regionId',
      'side',
      'phase',
    ].includes(key)
      ? choiceLabel(value)
      : value;
  }
  if (Array.isArray(value)) return value.map((item) => auditValue(key, item)).join(', ') || '—';
  const row = asRecord(safe(value));
  for (const name of ['fullName', 'name', 'title', 'code'])
    if (typeof row[name] === 'string') return String(row[name]);
  return (
    Object.entries(row)
      .map(([field, child]) => fieldLabel(field) + ': ' + auditValue(field, child))
      .join('; ') || '—'
  );
}
export function auditChanges(metadata: unknown) {
  const data = asRecord(metadata),
    before = asRecord(data.before),
    after = asRecord(data.after);
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(
      (key) =>
        !privateField.test(key) &&
        JSON.stringify(safe(before[key])) !== JSON.stringify(safe(after[key])),
    )
    .map((key) => ({
      key,
      label: labels[key] ?? fieldLabel(key),
      before: auditValue(key, before[key]),
      after: auditValue(key, after[key]),
    }));
}
