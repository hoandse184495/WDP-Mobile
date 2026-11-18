import { Text, View } from 'react-native';
import { Card, Badge, Detail, Empty } from '@/shared/components/ui';
import { colors, ui } from '@/core/theme/theme';
import { formatDate } from '@/core/utils/date';
import type { FeedForecast } from '../api/feed-forecast-api';
const quantity = (value: number, unit: string) =>
  `${value.toLocaleString('vi-VN', { maximumFractionDigits: 3 })} ${unit}`;
export function FeedForecastOverview({ data }: { data: FeedForecast }) {
  return (
    <View style={{ gap: 14 }}>
      <Card>
        <Text style={ui.heading}>Cân đối thức ăn · {data.days} ngày</Text>
        <Text style={ui.muted}>
          Từ {formatDate(data.day)} · Theo khẩu phần hiệu lực và vị trí lưu trú.
        </Text>
        {!data.summaryItems.length ? (
          <Empty label="Chưa có dữ liệu dự báo thức ăn. Cần ngựa đang lưu trú có khẩu phần hiệu lực." />
        ) : (
          data.summaryItems.map((item) => (
            <View
              key={item.itemId}
              style={{
                gap: 8,
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: colors.line,
              }}
            >
              <Text style={ui.label}>{item.name}</Text>
              <Badge
                label={
                  item.shortage7d > 0 ? `Thiếu ${quantity(item.shortage7d, item.unit)}` : 'Đủ dùng'
                }
                danger={item.shortage7d > 0}
              />
              <Detail label="Nhu cầu mỗi ngày" value={quantity(item.dailyNeed, item.unit)} />
              <Detail
                label={`Dự trù ${data.days} ngày`}
                value={quantity(item.sevenDayNeed, item.unit)}
              />
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={ui.muted}>Kho tổng</Text>
                  <Text style={ui.label}>{quantity(item.centralStock, item.unit)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ui.muted}>Kho phụ</Text>
                  <Text style={ui.label}>{quantity(item.branchStock, item.unit)}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </Card>
      <Card>
        <Text style={ui.heading}>Nhu cầu theo khu chuồng</Text>
        {!data.areas.length && <Empty label="Chưa có khu chuồng để tổng hợp." />}
        {data.areas.map((area) => (
          <View
            key={area.stableId}
            style={{ gap: 7, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line }}
          >
            <Text style={ui.label}>{area.stableName}</Text>
            <Text style={ui.muted}>{area.horseCount} ngựa đang lưu trú</Text>
            {!area.items.length && (
              <Text style={ui.muted}>Chưa có nhu cầu từ khẩu phần hiệu lực.</Text>
            )}
            {area.items.map((item) => (
              <View key={item.itemId} style={{ gap: 3 }}>
                <Text style={ui.body}>{item.name}</Text>
                <Text style={ui.muted}>
                  {quantity(item.dailyNeed, item.unit)}/ngày ·{' '}
                  {quantity(item.sevenDayNeed, item.unit)}/{data.days} ngày
                </Text>
              </View>
            ))}
          </View>
        ))}
      </Card>
    </View>
  );
}
