import { Text, View } from 'react-native';
import { Badge } from '@/shared/components/ui';
import { colors, ui } from '@/core/theme/theme';
import { Icon } from '@/shared/components/icon';
import { formatDate } from '@/core/utils/date';
import { atPath } from '@/features/operations/types/operation';
import { displayValue } from './record-details';
import { choiceLabel } from '@/features/operations/contracts/labels';
import type { WorkspaceModule, WorkspaceRecord } from '../types/catalog';
export function RecordSummary({
  config,
  record,
}: {
  config: WorkspaceModule;
  record: WorkspaceRecord;
}) {
  const status = record.displayStatus ?? record.status;
  const statusLabels: Record<string, string> = {
    pending_review: config.path === '/rations' ? 'Chờ bác sĩ duyệt' : 'Chờ xác nhận',
    approved: 'Đã duyệt',
    withdrawn: 'Đã thu hồi',
    expired: 'Hết hiệu lực',
    changes_requested: 'Cần chỉnh sửa',
  };
  const statusText =
    typeof status === 'string' ? (statusLabels[status] ?? choiceLabel(status)) : undefined;
  const fields = config.fields
    .filter(
      (field) =>
        !['status', 'displayStatus'].includes(field.key) && atPath(record, field.key) !== undefined,
    )
    .slice(0, 3);
  return (
    <View style={{ gap: 10 }}>
      {statusText && (
        <Badge
          label={statusText}
          danger={['rejected', 'cancelled', 'stopped'].includes(String(status))}
        />
      )}
      <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: 10, padding: 11, gap: 8 }}>
        {fields.map((field) => {
          const raw = atPath(record, field.key);
          const value = field.date && typeof raw === 'string' ? formatDate(raw) : displayValue(raw);
          return (
            <View
              key={field.key}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
            >
              <Icon
                name={
                  field.date
                    ? 'calendar'
                    : field.key.toLowerCase().includes('horse')
                      ? 'horse'
                      : 'file'
                }
                size={14}
                color={colors.muted}
              />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={[ui.muted, { fontSize: 10, lineHeight: 14 }]}>{field.label}</Text>
                <Text style={[ui.body, { fontSize: 12, lineHeight: 18, fontWeight: '500' }]}>
                  {value}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
