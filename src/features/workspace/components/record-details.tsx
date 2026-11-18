import { choiceLabel } from '@/features/operations/contracts/labels';
import { Text, View } from 'react-native';
import { ui } from '@/core/theme/theme';
import { formatDate } from '@/core/utils/date';
import { Detail } from '@/shared/components/ui';
import { roleLabels } from '@/core/constants/roles';
import { WorkspaceModule, WorkspaceRecord } from '../types/catalog';
import { atPath } from '@/features/operations/types/operation';
const labels: Record<string, string> = {
  build_up: 'Xây nền',
  sprint: 'Nước rút',
  endurance: 'Sức bền',
  recovery: 'Phục hồi',
  pre_race: 'Tiền thi đấu',
  dirt: 'Đường đất',
  turf: 'Đường cỏ',
  synthetic: 'Đường tổng hợp',
  light: 'Nhẹ',
  moderate: 'Vừa',
  intense: 'Cao',
  maximum: 'Tối đa',
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  draft: 'Bản nháp',
  pending: 'Đang chờ',
  open: 'Đang mở',
  acknowledged: 'Đã tiếp nhận',
  closed: 'Đã đóng',
  normal: 'Bình thường',
  urgent: 'Khẩn cấp',
  central: 'Kho chung',
  stable: 'Kho khu vực',
  ...roleLabels,
};
export function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'string') return labels[value] ?? choiceLabel(value);
  if (typeof value === 'number') return value.toLocaleString('vi-VN');
  if (Array.isArray(value)) return value.map(displayValue).join(', ');
  if (typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return (
      ['fullName', 'name', 'title', 'code']
        .map((key) => row[key])
        .filter((v) => typeof v === 'string')
        .join(' · ') || '—'
    );
  }
  return '—';
}
export function RecordDetails({
  config,
  record,
  compact = false,
}: {
  config: WorkspaceModule;
  record: WorkspaceRecord;
  compact?: boolean;
}) {
  const visible = config.fields.filter((field) => atPath(record, field.key) !== undefined);
  const exercises = Array.isArray(record.exercises)
    ? (record.exercises as Record<string, unknown>[])
    : config.path === '/training-plans' && record.distance !== undefined
      ? [record]
      : [];
  const meals = Array.isArray(record.meals) ? (record.meals as Record<string, unknown>[]) : [];
  const lines = Array.isArray(record.lines) ? (record.lines as Record<string, unknown>[]) : [];
  return (
    <View style={{ gap: 10 }}>
      {record.metricSource === 'simulated' && (
        <Text style={ui.error}>Kết quả mô phỏng phần mềm · Không phải số đo từ thiết bị.</Text>
      )}
      {(compact ? visible.slice(0, 3) : visible).map((field) => (
        <Detail
          key={field.key}
          label={field.label}
          value={
            field.date && typeof atPath(record, field.key) === 'string'
              ? formatDate(atPath(record, field.key) as string)
              : displayValue(atPath(record, field.key))
          }
        />
      ))}
      {!compact && (
        <>
          {exercises.map((exercise, index) => (
            <View key={index} style={ui.card}>
              <Text style={ui.heading}>{displayValue(exercise.title)}</Text>
              <Text style={ui.body}>
                {displayValue(exercise.distance)} m · {displayValue(exercise.surface)} ·{' '}
                {displayValue(exercise.workloadLevel)}
              </Text>
              <Text style={ui.muted}>
                Ngưỡng: {displayValue(exercise.targetSpeedMax)} m/s ·{' '}
                {displayValue(exercise.targetHeartRateMax)} bpm
              </Text>
              <Text style={ui.body}>{displayValue(exercise.instructions)}</Text>
            </View>
          ))}
          {meals.map((meal, i) => (
            <View style={ui.card} key={i}>
              <Text style={ui.heading}>{displayValue(meal.name)}</Text>
              <Detail label="Giờ bữa ăn" value={displayValue(meal.time)} />
              {Boolean(meal.instructions) && (
                <Detail label="Hướng dẫn bữa ăn" value={displayValue(meal.instructions)} />
              )}
              {Array.isArray(meal.lines) &&
                (meal.lines as Record<string, unknown>[]).map((line, j) => (
                  <Text key={j} style={ui.body}>
                    {displayValue(line.name ?? line.itemId)} · {displayValue(line.quantity)}{' '}
                    {displayValue(line.unit)}
                  </Text>
                ))}
            </View>
          ))}
          {lines.map((line, i) => (
            <Text key={i} style={ui.body}>
              {displayValue(line.name ?? line.item)} · {displayValue(line.quantity)}{' '}
              {displayValue(line.unit)}
            </Text>
          ))}
          {record.summaryOnly === true && (
            <Text style={ui.muted}>
              Tài khoản của bạn được xem bản tóm tắt theo quyền truy cập của backend.
            </Text>
          )}
        </>
      )}
    </View>
  );
}
