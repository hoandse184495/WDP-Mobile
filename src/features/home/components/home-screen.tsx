import { FeedForecastOverview } from '@/features/inventory/components/feed-forecast-overview';
import { OwnerOverview } from './owner-overview';
import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, ui } from '@/core/theme/theme';
import { roleLabels } from '@/core/constants/roles';
import { formatDate } from '@/core/utils/date';
import { useSession } from '@/features/auth/stores/session-store';
import { Card, Failure, IconButton, Loading, Screen, SectionHeader } from '@/shared/components/ui';
import { Icon, type IconName, moduleIcons } from '@/shared/components/icon';
import { loadRoleOverview } from '../api/role-overview';
import { destination, workspaces } from '../config/workspaces';
import { OverviewCharts } from './overview-charts';

const metricIcons: IconName[] = ['horse', 'target', 'activity', 'clipboard', 'lock', 'warning'];
const metricTones = [
  { ink: colors.primary, background: colors.primarySoft },
  { ink: colors.blue, background: colors.blueSoft },
  { ink: colors.gold, background: colors.goldSoft },
];
export default function HomeScreen() {
  const user = useSession((state) => state.user)!;
  const config = workspaces[user.role];
  const primary = destination(config.primary, user.role);
  const query = useQuery({
    queryKey: ['dashboard', user._id, user.role],
    queryFn: ({ signal }) => loadRoleOverview(user.role, signal),
  });
  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <View style={ui.between}>
        <View style={[ui.row, ui.grow, { gap: 10 }]}>
          <View style={styles.brandIcon}>
            <Icon name="horse" color="#DCC49C" size={25} />
          </View>
          <View style={ui.grow}>
            <Text style={styles.brand}>EQUINEPRO</Text>
            <Text style={styles.caption}>{roleLabels[user.role]}</Text>
          </View>
        </View>
        <IconButton icon="bell" label="Thông báo" onPress={() => router.push('/notifications')} />
      </View>

      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.orbit} />
        <View style={[ui.row, { gap: 6 }]}>
          <Icon name="calendar" size={13} color="#BED6CB" />
          <Text style={styles.heroDate}>{formatDate(new Date().toISOString())}</Text>
        </View>
        <View style={{ gap: 5 }}>
          <Text style={styles.greeting}>Xin chào, {user.fullName}</Text>
          <Text style={styles.heroTitle}>{config.title}</Text>
          <Text style={styles.heroDescription}>{config.description}</Text>
        </View>
        {primary && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={primary.title}
            onPress={() => router.push(primary.path as Href)}
            style={({ pressed }) => [styles.primaryAction, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Icon
              name={moduleIcons[config.primary] ?? 'tasks'}
              color={colors.primaryDeep}
              size={18}
            />
            <Text style={[ui.label, ui.grow, { color: colors.primaryDeep }]}>{primary.title}</Text>
            <Icon name="arrow" color={colors.primaryDeep} size={17} />
          </Pressable>
        )}
      </View>

      <View style={styles.section}>
        <View style={{ gap: 2 }}>
          <Text style={ui.sectionTitle}>Chỉ số tổng quan</Text>
          <Text style={styles.caption}>Dữ liệu trong phạm vi của bạn</Text>
        </View>
        {query.isPending ? (
          <Loading label="Đang tổng hợp dữ liệu…" />
        ) : query.error ? (
          <Failure error={query.error} retry={() => void query.refetch()} />
        ) : (
          <View style={styles.grid}>
            {query.data?.metrics.map((metric, index) => {
              const tone = /cảnh báo|khóa|chấn thương/i.test(metric.label)
                ? { ink: colors.gold, background: colors.goldSoft }
                : metricTones[index % metricTones.length];
              return (
                <View key={metric.label} style={styles.metric}>
                  <View style={[styles.metricIcon, { backgroundColor: tone.background }]}>
                    <Icon
                      name={metricIcons[index % metricIcons.length]}
                      size={17}
                      color={tone.ink}
                    />
                  </View>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {query.data?.feedForecast && <FeedForecastOverview data={query.data.feedForecast} />}
      <View style={styles.section}>
        <SectionHeader title="Truy cập nhanh" />
        <View style={styles.shortcutPanel}>
          {config.shortcuts.map((key) => {
            const item = destination(key, user.role);
            return item ? (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                onPress={() => router.push(item.path as Href)}
                style={({ pressed }) => [
                  styles.shortcut,
                  { backgroundColor: pressed ? colors.primarySoft : colors.surfaceMuted },
                ]}
              >
                <View style={ui.between}>
                  <Icon name={moduleIcons[key] ?? 'grid'} color={colors.primary} size={21} />
                  <Icon name="chevron" color="#9AADA3" size={13} />
                </View>
                <Text style={[ui.label, { fontSize: 12, lineHeight: 18 }]}>{item.title}</Text>
              </Pressable>
            ) : null;
          })}
        </View>
      </View>

      {user.role !== 'horse_owner' &&
        query.data?.sections.map((section) => (
          <Card key={section.title}>
            <SectionHeader
              title={section.title}
              action={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Xem tất cả: ${section.title}`}
                  onPress={() => router.push(section.path as Href)}
                  style={styles.seeAll}
                >
                  <Text style={styles.seeAllText}>Tất cả</Text>
                  <Icon name="arrow" color={colors.primary} size={14} />
                </Pressable>
              }
            />
            {!section.items.length && (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Icon name="check" color={colors.primary} size={20} />
                </View>
                <Text style={[ui.muted, ui.grow, { fontSize: 12 }]}>{section.empty}</Text>
              </View>
            )}
            {section.items.map((item, index) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => router.push(item.path as Href)}
                style={({ pressed }) => [
                  styles.record,
                  index > 0 && styles.recordDivider,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View
                  style={[
                    styles.recordIcon,
                    { backgroundColor: item.danger ? colors.goldSoft : colors.primarySoft },
                  ]}
                >
                  <Icon
                    name={item.danger ? 'warning' : 'file'}
                    size={18}
                    color={item.danger ? colors.gold : colors.primary}
                  />
                </View>
                <View style={[ui.grow, { gap: 3 }]}>
                  <Text style={ui.label}>{item.title}</Text>
                  <Text style={[styles.caption, { lineHeight: 18 }]} numberOfLines={2}>
                    {item.detail}
                  </Text>
                  {item.danger && <Text style={styles.attention}>Cần chú ý</Text>}
                </View>
                <Icon name="chevron" size={15} color="#9AADA3" />
              </Pressable>
            ))}
          </Card>
        ))}
      {user.role === 'horse_owner' && query.data?.owner && (
        <OwnerOverview data={query.data.owner} />
      )}
      {query.data && <OverviewCharts overview={query.data} />}
    </Screen>
  );
}
const styles = StyleSheet.create({
  brandIcon: {
    width: 40,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: colors.primaryDeep,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.8,
    lineHeight: 20,
  },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  hero: {
    backgroundColor: colors.primaryDeep,
    borderRadius: 22,
    padding: 20,
    gap: 15,
    overflow: 'hidden',
  },
  orbit: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 24,
    borderColor: '#FFFFFF05',
    right: -100,
    top: -60,
  },
  heroDate: { color: '#BED6CB', fontSize: 11, lineHeight: 16 },
  greeting: { color: '#C2D9CD', fontSize: 13, lineHeight: 20 },
  heroTitle: {
    color: colors.white,
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.7,
    lineHeight: 33,
  },
  heroDescription: { color: '#C2D9CD', fontSize: 12, lineHeight: 20, maxWidth: 450 },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0F6F1',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
  },
  section: { gap: 12, marginTop: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    flexBasis: '46%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 15,
    alignItems: 'flex-start',
    gap: 6,
  },
  metricIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  shortcutPanel: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shortcut: {
    flexBasis: '46%',
    flexGrow: 1,
    padding: 13,
    borderRadius: 11,
    gap: 11,
    minHeight: 84,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 12,
    paddingLeft: 8,
  },
  seeAllText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  emptyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  record: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 11 },
  recordDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  recordIcon: {
    width: 36,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attention: { color: colors.gold, fontSize: 11, lineHeight: 17, fontWeight: '600' },
});
