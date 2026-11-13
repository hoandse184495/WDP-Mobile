import { OwnerJournalAccess } from '@/features/horses/components/owner-journal-access';
import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { colors, ui } from '@/core/theme/theme';
import { roleLabels } from '@/core/constants/roles';
import { useSession } from '@/features/auth/stores/session-store';
import {
  Badge,
  Card,
  Failure,
  IconButton,
  Loading,
  Screen,
  SectionHeader,
} from '@/shared/components/ui';
import { Icon, IconName, moduleIcons } from '@/shared/components/icon';
import { loadRoleOverview } from '../api/role-overview';
import { destination, workspaces } from '../config/workspaces';
import { OverviewCharts } from './overview-charts';
const metricIcons: IconName[] = ['horse', 'target', 'activity', 'clipboard', 'lock', 'warning'];
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
        <View style={[ui.row, { gap: 10 }]}>
          <View
            style={[
              ui.iconTile,
              { backgroundColor: colors.primaryDeep, width: 38, height: 42, borderRadius: 12 },
            ]}
          >
            <Icon name="horse" color="#DCC49C" size={26} />
          </View>
          <View style={{ gap: 2 }}>
            <Text
              style={{
                color: colors.primaryDeep,
                fontSize: 14,
                fontWeight: '800',
                letterSpacing: 2,
              }}
            >
              EQUINEPRO
            </Text>
            <Text style={[ui.muted, { fontSize: 11 }]}>{roleLabels[user.role]}</Text>
          </View>
        </View>
        <IconButton icon="bell" label="Thông báo" onPress={() => router.push('/notifications')} />
      </View>
      <View style={ui.hero}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 160,
            height: 160,
            borderRadius: 80,
            borderWidth: 1,
            borderColor: '#FFFFFF15',
            right: -70,
            top: -45,
          }}
        />
        <Text style={{ color: '#C7DCCB', fontSize: 12 }}>Xin chào, {user.fullName}</Text>
        <Text style={[ui.title, { color: colors.white, fontSize: 25, lineHeight: 32 }]}>
          {config.title}
        </Text>
        <Text style={{ color: '#C0D2C5', fontSize: 12, lineHeight: 19 }}>{config.description}</Text>
        {primary && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={primary.title}
            onPress={() => router.push(primary.path as Href)}
            style={[
              ui.between,
              {
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                paddingHorizontal: 15,
                paddingVertical: 13,
                marginTop: 2,
              },
            ]}
          >
            <Text style={{ color: colors.primaryDeep, fontSize: 13, fontWeight: '700', flex: 1 }}>
              {primary.title}
            </Text>
            <Icon name="arrow" color={colors.primaryDeep} size={18} />
          </Pressable>
        )}
      </View>
      <View style={{ gap: 12 }}>
        <SectionHeader
          title="Chỉ số tổng quan"
          action={<Text style={[ui.muted, { fontSize: 11 }]}>Trong phạm vi của bạn</Text>}
        />
        {query.isPending ? (
          <Loading label="Đang tổng hợp dữ liệu…" />
        ) : query.error ? (
          <Failure error={query.error} retry={() => void query.refetch()} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {query.data?.metrics.map((metric, index) => (
              <View
                key={metric.label}
                style={[ui.card, { flexBasis: '46%', flexGrow: 1, padding: 15, gap: 12 }]}
              >
                <View style={ui.between}>
                  <Text
                    style={{
                      color: colors.ink,
                      fontSize: 27,
                      lineHeight: 33,
                      letterSpacing: -0.8,
                      fontWeight: '700',
                      flexShrink: 1,
                    }}
                  >
                    {metric.value}
                  </Text>
                  <View
                    style={{
                      backgroundColor: index % 3 === 1 ? colors.goldSoft : colors.primarySoft,
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon
                      name={metricIcons[index % metricIcons.length]}
                      size={16}
                      color={index % 3 === 1 ? colors.gold : colors.primary}
                    />
                  </View>
                </View>
                <Text style={[ui.muted, { fontSize: 11, lineHeight: 17 }]}>{metric.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={{ gap: 12 }}>
        <SectionHeader title="Truy cập nhanh" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {config.shortcuts.map((key, index) => {
            const item = destination(key, user.role);
            return item ? (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                onPress={() => router.push(item.path as Href)}
                style={({ pressed }) => [
                  ui.card,
                  {
                    flexBasis: '46%',
                    flexGrow: 1,
                    padding: 14,
                    minHeight: 88,
                    gap: 12,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View style={ui.between}>
                  <Icon
                    name={moduleIcons[key] ?? 'grid'}
                    color={index % 2 ? colors.gold : colors.primary}
                    size={22}
                  />
                  <Icon name="chevron" color="#AAB6AD" size={14} />
                </View>
                <Text style={[ui.label, { fontSize: 12, lineHeight: 18 }]}>{item.title}</Text>
              </Pressable>
            ) : null;
          })}
        </View>
      </View>
      {user.role === 'horse_owner' && <OwnerJournalAccess />}
      {query.data && <OverviewCharts overview={query.data} />}
      {query.data?.sections.map((section) => (
        <Card key={section.title}>
          <SectionHeader
            title={section.title}
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Xem tất cả: ${section.title}`}
                onPress={() => router.push(section.path as Href)}
                style={{ paddingVertical: 3, paddingLeft: 8 }}
              >
                <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>
                  Tất cả
                </Text>
              </Pressable>
            }
          />
          {!section.items.length && (
            <View style={{ paddingVertical: 18, alignItems: 'center', gap: 9 }}>
              <Icon name="check" color={colors.primary} size={24} />
              <Text style={[ui.muted, { textAlign: 'center', fontSize: 12 }]}>{section.empty}</Text>
            </View>
          )}
          {section.items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => router.push(item.path as Href)}
              style={[
                ui.row,
                {
                  paddingTop: 13,
                  paddingBottom: 5,
                  borderTopWidth: 1,
                  borderTopColor: colors.lineSoft,
                  gap: 11,
                },
              ]}
            >
              <View
                style={[
                  ui.iconTile,
                  {
                    width: 36,
                    height: 40,
                    borderRadius: 11,
                    backgroundColor: item.danger ? colors.dangerSoft : colors.primarySoft,
                  },
                ]}
              >
                <Icon
                  name={item.danger ? 'warning' : 'file'}
                  size={18}
                  color={item.danger ? colors.danger : colors.primary}
                />
              </View>
              <View style={[ui.grow, { gap: 4 }]}>
                <Text style={ui.label}>{item.title}</Text>
                <Text
                  style={[item.danger ? ui.error : ui.muted, { fontSize: 11, lineHeight: 17 }]}
                  numberOfLines={2}
                >
                  {item.detail}
                </Text>
                {item.danger && <Badge label="Cần chú ý" danger />}
              </View>
              <Icon name="chevron" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
