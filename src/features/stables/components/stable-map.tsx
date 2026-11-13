import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Empty } from '@/shared/components/ui';
import { colors, ui } from '@/core/theme/theme';
import { JsonRecord, asRecord, entityId } from '@/features/operations/types/operation';
export function StableMap({ record }: { record: JsonRecord }) {
  const plan = asRecord(record.floorPlan),
    items = Array.isArray(plan.items) ? plan.items.map(asRecord) : [];
  const width = Number(plan.width ?? 0),
    height = Number(plan.height ?? 0),
    scale = width > 0 ? Math.min(1, 600 / width) : 1;
  const details = asRecord(record._details),
    stalls = Array.isArray(details.stalls) ? details.stalls.map(asRecord) : [];
  return (
    <Card>
      <Text style={ui.heading}>Mặt bằng khu chuồng</Text>
      <Text style={ui.muted}>Chạm ô chuồng để mở hồ sơ. Có thể cuộn ngang để xem toàn bộ khu.</Text>
      {!items.length || !width || !height ? (
        <Empty
          label="Chưa có mặt bằng"
          detail="Quản lý có thể tạo hoặc chỉnh mặt bằng trong phần thao tác."
        />
      ) : (
        <ScrollView horizontal>
          <View
            style={{
              width: width * scale,
              height: height * scale,
              backgroundColor: '#EDF3EE',
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            {items.map((item, index) => {
              const stall = stalls.find((row) => entityId(row) === item.stallId);
              return (
                <Pressable
                  key={String(item.id ?? index)}
                  accessibilityRole={item.type === 'stall' ? 'button' : undefined}
                  onPress={() => {
                    if (item.stallId)
                      router.push({
                        pathname: '/records/[module]/[id]',
                        params: { module: 'stalls', id: String(item.stallId) },
                      });
                  }}
                  style={{
                    position: 'absolute',
                    left: Number(item.x) * scale,
                    top: Number(item.y) * scale,
                    width: Number(item.width) * scale,
                    height: Number(item.height) * scale,
                    padding: 3,
                    borderWidth: item.type === 'label' ? 0 : 1,
                    borderColor: colors.line,
                    backgroundColor:
                      item.type === 'label'
                        ? 'transparent'
                        : item.type === 'stall'
                          ? stall?.maintenance
                            ? '#F5DDBB'
                            : stall?.occupied
                              ? colors.primarySoft
                              : '#FFFFFF'
                          : item.type === 'aisle'
                            ? '#DDE5E2'
                            : item.type === 'gate'
                              ? '#BBDBEF'
                              : '#C7D5C0',
                  }}
                >
                  <Text numberOfLines={3} style={{ fontSize: 11, color: colors.ink }}>
                    {String(item.label ?? stall?.code ?? '')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </Card>
  );
}
