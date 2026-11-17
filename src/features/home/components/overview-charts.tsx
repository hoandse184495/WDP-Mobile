import { StyleSheet, Text, View } from 'react-native';
import { colors, ui } from '@/core/theme/theme';
import { Card } from '@/shared/components/ui';
import { Icon } from '@/shared/components/icon';
import { healthLabels } from '@/features/horses/types/horse';
import type { Overview } from '../api/role-overview';

const healthColors: Record<string, string> = {
  ready: colors.primary,
  monitoring: colors.gold,
  injured: colors.danger,
  isolated: '#8574AB',
};
export function OverviewCharts({ overview }: { overview: Overview }) {
  const health = overview.health;
  const total = health ? Object.values(health).reduce((sum, count) => sum + count, 0) : 0;
  const activity = overview.activity?.slice(-7);
  const max = Math.max(1, ...(activity?.map((day) => day.sessions) ?? []));
  const latest = activity?.at(-1);
  return (
    <>
      {health && (
        <Card>
          <View style={ui.between}>
            <View style={[ui.grow, { gap: 3 }]}>
              <Text style={ui.heading}>Sức khỏe đàn ngựa</Text>
              <Text style={styles.caption}>Phân bố theo tình trạng hiện tại</Text>
            </View>
            <View style={styles.total}>
              <Text style={styles.totalText}>{total} ngựa</Text>
            </View>
          </View>
          <View style={styles.healthTrack}>
            {Object.entries(health).map(([key, count]) =>
              count > 0 ? (
                <View key={key} style={{ flex: count, backgroundColor: healthColors[key] }} />
              ) : null,
            )}
          </View>
          <View style={styles.legend}>
            {Object.entries(healthLabels).map(([key, label]) => (
              <View
                key={key}
                style={styles.legendItem}
                accessible
                accessibilityLabel={`${label}: ${health[key as keyof typeof health]} ngựa`}
              >
                <View style={[styles.dot, { backgroundColor: healthColors[key] }]} />
                <Text style={[styles.caption, ui.grow]}>{label}</Text>
                <Text style={ui.label}>{health[key as keyof typeof health]}</Text>
              </View>
            ))}
          </View>
          {total === 0 && (
            <Text style={styles.caption}>Chưa có dữ liệu sức khỏe trong phạm vi của bạn.</Text>
          )}
        </Card>
      )}
      {activity && (
        <Card>
          <View style={ui.between}>
            <View style={[ui.grow, { gap: 3 }]}>
              <Text style={ui.heading}>Nhịp độ huấn luyện</Text>
              <Text style={styles.caption}>7 ngày có hoạt động gần nhất trong kỳ 30 ngày</Text>
            </View>
            <View style={styles.chartIcon}>
              <Icon name="chart" color={colors.primary} size={19} />
            </View>
          </View>
          {!activity.length ? (
            <Text style={[styles.caption, { paddingVertical: 12 }]}>
              Chưa có hoạt động huấn luyện trong kỳ.
            </Text>
          ) : (
            <>
              <View style={styles.chart}>
                {activity.map((day, index) => (
                  <View
                    key={day.date}
                    accessible
                    accessibilityLabel={`${day.date}: ${day.sessions} buổi tập, ${day.alerts} cảnh báo`}
                    style={styles.column}
                  >
                    <Text style={[ui.label, { fontSize: 12 }]}>{day.sessions}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={{
                          height: (day.sessions / max) * 78,
                          minHeight: 2,
                          backgroundColor:
                            index === activity.length - 1 ? colors.primary : '#B6D5C5',
                          borderRadius: 5,
                        }}
                      />
                    </View>
                    <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 16 }}>
                      {day.date.slice(8, 10)}/{day.date.slice(5, 7)}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.caption}>Số buổi tập theo ngày</Text>
              <View style={styles.latest}>
                <Text style={[styles.caption, { width: '100%' }]}>
                  Chỉ số trung bình ngày gần nhất
                </Text>
                <View style={styles.reading}>
                  <Icon name="activity" color={colors.primary} size={16} />
                  <Text style={ui.label}>{latest!.averageSpeed ?? '—'} m/s</Text>
                </View>
                <View style={styles.reading}>
                  <Icon name="medical" color={colors.gold} size={15} />
                  <Text style={ui.label}>{latest!.averageHeartRate ?? '—'} bpm</Text>
                </View>
              </View>
            </>
          )}
        </Card>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  total: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  totalText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  healthTrack: {
    flexDirection: 'row',
    height: 9,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    gap: 2,
    marginVertical: 4,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', flexBasis: '44%', flexGrow: 1, gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  chartIcon: {
    backgroundColor: colors.primarySoft,
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-end',
    paddingTop: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    paddingBottom: 8,
  },
  column: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: {
    height: 86,
    justifyContent: 'flex-end',
    width: '68%',
    maxWidth: 36,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 5,
  },
  latest: {
    backgroundColor: colors.surfaceMuted,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reading: { flexDirection: 'row', alignItems: 'center', gap: 7, flexGrow: 1 },
});
