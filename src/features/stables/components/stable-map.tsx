import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Empty, Field, Choice, Button } from '@/shared/components/ui';
import { colors, ui } from '@/core/theme/theme';
import { JsonRecord, asRecord } from '@/features/operations/types/operation';
import { normalizeSearch } from '@/features/operations/hooks/use-reference-options';
import { stableMapCells, stallHealthStates } from '../utils/stable-map';
export function StableMap({ record }: { record: JsonRecord }) {
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all');
  const [zoom, setZoom] = useState(1),
    [containerWidth, setContainerWidth] = useState(300);
  const plan = asRecord(record.floorPlan),
    cells = stableMapCells(record);
  const width = Number(plan.width ?? 0),
    height = Number(plan.height ?? 0);
  const fit = width > 0 ? Math.min(1, containerWidth / width) : 1;
  // Keep stalls readable initially; Fit explicitly shows the full floor geometry.
  const scale = Math.max(fit, Math.min(1, 800 / Math.max(width, 1))) * zoom;
  const needle = normalizeSearch(search.trim());
  const matches = (cell: (typeof cells)[number]) =>
    (!needle ||
      normalizeSearch([cell.label, cell.occupant, cell.registrationCode].join(' ')).includes(
        needle,
      )) &&
    (filter === 'all' ||
      (filter === 'free'
        ? cell.status === 'Trống'
        : filter === 'locked'
          ? cell.horse?.isTrainingLocked === true
          : cell.horse?.healthStatus === filter));
  const visibleStalls = cells.filter((cell) => cell.stall && matches(cell));
  const open = (stallId: string) => {
    if (stallId)
      router.push({
        pathname: '/records/[module]/[id]',
        params: { module: 'stalls', id: stallId },
      });
  };
  return (
    <>
      <Card>
        <Text style={ui.heading}>Mặt bằng khu chuồng</Text>
        <Text style={ui.muted}>
          Chạm ô để xem ngựa, người chăm sóc và công việc. Vuốt ngang để xem toàn khu.
        </Text>
        {!cells.length || width <= 0 || height <= 0 ? (
          <Empty
            label="Chưa có mặt bằng"
            detail="Quản lý có thể tạo hoặc chỉnh mặt bằng trong phần thao tác."
          />
        ) : (
          <>
            <Field label="Tìm mã ô hoặc tên ngựa" value={search} onChangeText={setSearch} />
            <Choice
              label="Lọc trạng thái ô"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'ready', label: 'Đủ điều kiện' },
                { value: 'monitoring', label: 'Cần theo dõi' },
                { value: 'injured', label: 'Chấn thương' },
                { value: 'isolated', label: 'Cách ly' },
                { value: 'locked', label: 'Khóa tập' },
                { value: 'free', label: 'Ô trống' },
              ]}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {Object.values(stallHealthStates).map((state) => (
                <View
                  key={state.label}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <View
                    style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: state.stroke }}
                  />
                  <Text style={[ui.muted, { fontSize: 10 }]}>{state.label}</Text>
                </View>
              ))}
              <Text style={[ui.muted, { fontSize: 10 }]}>Xám: trống / chưa xác định</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <Button
                title="−"
                secondary
                disabled={zoom <= 0.5}
                onPress={() => setZoom((z) => Math.max(0.5, z / 1.25))}
              />
              <Text style={ui.muted}>{Math.round((scale / fit) * 100)}%</Text>
              <Button
                title="+"
                secondary
                disabled={zoom >= 3}
                onPress={() => setZoom((z) => Math.min(3, z * 1.25))}
              />
              <Button
                title="Vừa khung"
                secondary
                onPress={() => setZoom(fit / Math.max(fit, Math.min(1, 800 / width)))}
              />
            </View>
            <View
              onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
              style={{
                overflow: 'hidden',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.line,
              }}
            >
              <ScrollView horizontal nestedScrollEnabled>
                <View
                  style={{
                    width: width * scale,
                    height: height * scale,
                    backgroundColor: '#FAFBF8',
                  }}
                >
                  {[...cells]
                    .sort(
                      (a, b) =>
                        Number(['gate', 'label'].includes(String(a.item.type))) -
                        Number(['gate', 'label'].includes(String(b.item.type))),
                    )
                    .map((cell, index) => {
                      const { item } = cell,
                        isStall = Boolean(cell.stall),
                        label = item.type === 'label';
                      const boxWidth = Number(item.width) * scale,
                        boxHeight = Number(item.height) * scale;
                      return (
                        <Pressable
                          key={cell.id || String(index)}
                          accessibilityRole={isStall ? 'button' : undefined}
                          accessibilityLabel={
                            isStall
                              ? [cell.label, cell.status, cell.occupant].join(' · ')
                              : cell.label
                          }
                          disabled={!isStall}
                          onPress={() => open(cell.stallId)}
                          style={{
                            position: 'absolute',
                            left: Number(item.x) * scale,
                            top: Number(item.y) * scale,
                            width: boxWidth,
                            height: boxHeight,
                            padding: Math.max(2, 5 * scale),
                            justifyContent: 'center',
                            alignItems: 'center',
                            overflow: 'hidden',
                            borderWidth: label ? 0 : isStall ? 2 : 1,
                            borderRadius: isStall ? 9 : 0,
                            borderColor: cell.stroke,
                            opacity: isStall && !matches(cell) ? 0.25 : 1,
                            backgroundColor: label
                              ? 'transparent'
                              : item.type === 'aisle'
                                ? '#E5EDE8'
                                : item.type === 'gate'
                                  ? '#DDEDF6'
                                  : cell.fill,
                          }}
                        >
                          <Text
                            numberOfLines={2}
                            style={{
                              fontSize: Math.max(9, Math.min(13, boxWidth / 8)),
                              fontWeight: '700',
                              color: colors.ink,
                              textAlign: 'center',
                            }}
                          >
                            {cell.label}
                          </Text>
                          {isStall && boxHeight >= 56 && (
                            <Text
                              numberOfLines={2}
                              style={{
                                fontSize: 10,
                                color: cell.stroke,
                                textAlign: 'center',
                                marginTop: 4,
                              }}
                            >
                              {cell.status}
                            </Text>
                          )}
                          {isStall && boxHeight >= 82 && (
                            <Text
                              numberOfLines={2}
                              style={{
                                fontSize: 11,
                                color: colors.ink,
                                textAlign: 'center',
                                marginTop: 5,
                              }}
                            >
                              {cell.occupant}
                            </Text>
                          )}
                        </Pressable>
                      );
                    })}
                </View>
              </ScrollView>
            </View>
            <Text style={[ui.muted, { fontSize: 10 }]}>
              Sơ đồ tham khảo, không theo tỷ lệ thực tế. Ô ngoài phạm vi xem không mở được hồ sơ.
            </Text>
          </>
        )}
      </Card>
      {cells.some((cell) => cell.stall) && (
        <Card>
          <Text style={ui.heading}>Thông tin ô chuồng · {visibleStalls.length} ô</Text>
          <Text style={ui.muted}>
            Danh sách dưới đây luôn hiển thị đầy đủ tên và trạng thái khi sơ đồ thu nhỏ.
          </Text>
          {visibleStalls.length ? (
            visibleStalls.map((cell) => (
              <Pressable
                key={cell.stallId}
                accessibilityRole="button"
                accessibilityLabel={'Xem chi tiết ô ' + cell.label}
                onPress={() => open(cell.stallId)}
                style={{
                  padding: 14,
                  gap: 5,
                  borderWidth: 1,
                  borderColor: cell.stroke,
                  borderRadius: 12,
                  backgroundColor: cell.fill,
                }}
              >
                <Text style={ui.label}>
                  {cell.label} · {cell.status}
                </Text>
                <Text style={ui.body}>{cell.occupant}</Text>
                {cell.registrationCode ? (
                  <Text style={ui.muted}>{cell.registrationCode}</Text>
                ) : null}
              </Pressable>
            ))
          ) : (
            <Empty label="Không có ô phù hợp" />
          )}
        </Card>
      )}
    </>
  );
}
