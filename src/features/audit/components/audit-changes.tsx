import { Text, View } from 'react-native';
import { Card, Detail } from '@/shared/components/ui';
import { ui } from '@/core/theme/theme';
import { asRecord } from '@/features/operations/types/operation';
import { auditChanges } from '../utils/audit-changes';
export function AuditChanges({ metadata }: { metadata: unknown }) {
  const data = asRecord(metadata),
    rows = auditChanges(metadata);
  const reason = typeof data.reason === 'string' ? data.reason : '';
  return (
    <Card>
      <Text style={ui.heading}>Thay đổi trước / sau</Text>
      {!!reason && <Detail label="Lý do thay đổi" value={reason} />}
      {rows.length ? (
        rows.map((row) => (
          <View key={row.key} style={{ gap: 5, paddingVertical: 8 }}>
            <Text style={ui.label}>{row.label}</Text>
            <Detail label="Trước" value={row.before} />
            <Detail label="Sau" value={row.after} />
          </View>
        ))
      ) : (
        <Text style={ui.muted}>Nhật ký này không có thay đổi trước/sau để hiển thị.</Text>
      )}
    </Card>
  );
}
