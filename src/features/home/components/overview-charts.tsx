import { Text, View } from 'react-native';
import { colors, ui } from '@/core/theme/theme';
import { Card } from '@/shared/components/ui';
import { healthLabels } from '@/features/horses/types/horse';
import type { Overview } from '../api/role-overview';

export function OverviewCharts({ overview }: { overview: Overview }) {
  const health = overview.health;
  const total = health ? Object.values(health).reduce((sum, count) => sum + count, 0) : 0;
  const activity = overview.activity?.slice(-7);
  const max = Math.max(1, ...(activity?.map((day) => day.sessions) ?? []));
  return (
    <>
      {health && (
        <Card>
          <Text style={ui.heading}>Sức khỏe đàn ngựa</Text>
          {Object.entries(healthLabels).map(([key, label]) => {
            const count = health[key as keyof typeof health];
            return (
              <View key={key} style={{ gap: 6 }}>
                <View style={ui.between}>
                  <Text style={ui.body}>{label}</Text>
                  <Text style={ui.label}>{count}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: colors.primarySoft, borderRadius: 3 }}>
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor:
                        key === 'ready'
                          ? colors.primary
                          : key === 'injured'
                            ? colors.danger
                            : colors.gold,
                      width: `${total ? (count / total) * 100 : 0}%`,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </Card>
      )}
      {activity && (
        <Card>
          <Text style={ui.heading}>Nhịp độ huấn luyện</Text>
          <Text style={ui.muted}>Tối đa 7 ngày có hoạt động gần nhất trong kỳ 30 ngày.</Text>
          {!activity.length ? (
            <Text style={ui.muted}>Chưa có hoạt động huấn luyện trong kỳ.</Text>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                {activity.map((day) => (
                  <View
                    key={day.date}
                    accessible
                    accessibilityLabel={`${day.date}: ${day.sessions} buổi tập, ${day.alerts} cảnh báo`}
                    style={{ flex: 1, alignItems: 'center', gap: 6 }}
                  >
                    <Text style={ui.label}>{day.sessions}</Text>
                    <View style={{ height: 80, justifyContent: 'flex-end', width: '100%' }}>
                      <View
                        style={{
                          height: (day.sessions / max) * 80,
                          minHeight: 2,
                          backgroundColor: colors.primary,
                          borderRadius: 4,
                        }}
                      />
                    </View>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>
                      {day.date.slice(8, 10)}/{day.date.slice(5, 7)}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={ui.muted}>Chiều cao cột: số buổi tập trong ngày.</Text>
              <Text style={ui.body}>
                Ngày gần nhất: {activity.at(-1)!.averageSpeed ?? '—'} m/s ·{' '}
                {activity.at(-1)!.averageHeartRate ?? '—'} bpm
              </Text>
            </>
          )}
        </Card>
      )}
    </>
  );
}
