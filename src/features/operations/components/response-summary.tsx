import { Text, View } from 'react-native';
import { colors, ui } from '@/core/theme/theme';
import { fieldLabel, choiceLabel } from '../contracts/labels';
import { asRecord } from '../types/operation';
const hidden =
  /^(?:_id|id|.*Id|revision|stockVersion|previewHash|requestKey|requestHash|token|path|bucket|url|.*Url|__v|_details|modelId|modelVersion|layer)$/;
export function ResponseSummary({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (depth > 8 || data === undefined || data === null) return null;
  if (Array.isArray(data))
    return (
      <View style={{ gap: 10 }}>
        {data.length ? (
          data.map((row, i) => (
            <View
              key={i}
              style={{
                gap: 8,
                paddingLeft: 12,
                paddingVertical: 10,
                backgroundColor: colors.surfaceMuted,
                borderRadius: 12,
                paddingRight: 10,
              }}
            >
              <ResponseSummary data={row} depth={depth + 1} />
            </View>
          ))
        ) : (
          <Text style={ui.muted}>Chưa có dữ liệu.</Text>
        )}
      </View>
    );
  if (typeof data !== 'object')
    return (
      <Text style={ui.body}>
        {typeof data === 'boolean' ? (data ? 'Có' : 'Không') : choiceLabel(String(data))}
      </Text>
    );
  return (
    <View style={{ gap: 8 }}>
      {Object.entries(asRecord(data))
        .filter(
          ([key, value]) =>
            !hidden.test(key) &&
            !/password|secret|token|hash/i.test(key) &&
            value !== undefined &&
            value !== null,
        )
        .map(([key, value]) => (
          <View key={key} style={{ gap: 4, paddingVertical: 4 }}>
            <Text style={[ui.muted, { fontSize: 11 }]}>{fieldLabel(key)}</Text>
            <ResponseSummary data={value} depth={depth + 1} />
          </View>
        ))}
    </View>
  );
}
