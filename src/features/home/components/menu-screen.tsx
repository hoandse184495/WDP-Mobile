import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { colors, ui } from '@/core/theme/theme';
import { roleLabels } from '@/core/constants/roles';
import { useSession } from '@/features/auth/stores/session-store';
import { Badge, Empty, Field, Screen, ScreenHeader } from '@/shared/components/ui';
import { Icon, IconName, moduleIcons } from '@/shared/components/icon';
import { navigationGroups } from '../config/workspaces';
const groupIcons: IconName[] = ['stable', 'target', 'medical', 'warehouse', 'shield'];
const tones = [colors.primary, colors.gold, colors.blue, colors.primary, colors.gold];
export default function MenuScreen() {
  const user = useSession((state) => state.user)!;
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const groups = navigationGroups(user.role, search);
  return (
    <Screen>
      <ScreenHeader
        title="Không gian làm việc"
        subtitle="Mọi công cụ bạn cần, sắp xếp theo nghiệp vụ."
        eyebrow="CHỨC NĂNG"
      />
      <Badge label={roleLabels[user.role]} />
      <Field
        label="Tìm chức năng"
        icon="search"
        placeholder="Bạn muốn thực hiện việc gì?"
        value={search}
        onChangeText={setSearch}
      />
      {!groups.length && <Empty label="Không tìm thấy chức năng" />}
      {groups.map((group, index) => {
        const open = Boolean(search.trim()) || expanded === group.title;
        return (
          <View key={group.title} style={[ui.card, { padding: 0, gap: 0, overflow: 'hidden' }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={group.title}
              onPress={() => setExpanded(open ? null : group.title)}
              style={[ui.row, { padding: 16, gap: 12, minHeight: 74 }]}
            >
              <View
                style={[
                  ui.iconTile,
                  { backgroundColor: index % 2 ? colors.goldSoft : colors.primarySoft },
                ]}
              >
                <Icon
                  name={groupIcons[index % groupIcons.length]}
                  color={tones[index % tones.length]}
                  size={22}
                />
              </View>
              <View style={[ui.grow, { gap: 5 }]}>
                <Text style={[ui.heading, { fontSize: 14, lineHeight: 20 }]}>{group.title}</Text>
                <Text style={[ui.muted, { fontSize: 11 }]}>
                  {group.items.length} công cụ dành cho bạn
                </Text>
              </View>
              <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
                <Icon name="down" color={colors.muted} size={16} />
              </View>
            </Pressable>
            {open && (
              <View style={{ backgroundColor: colors.surfaceMuted, paddingHorizontal: 16 }}>
                {group.items.map((item) => (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityLabel={item.title}
                    onPress={() => router.push(item.path as Href)}
                    style={[
                      ui.row,
                      {
                        minHeight: 55,
                        gap: 12,
                        borderTopWidth: 1,
                        borderTopColor: colors.lineSoft,
                        paddingVertical: 10,
                      },
                    ]}
                  >
                    <Icon name={moduleIcons[item.key] ?? 'file'} size={18} color={colors.muted} />
                    <Text style={[ui.body, ui.grow, { fontSize: 13 }]}>{item.title}</Text>
                    <Icon name="chevron" size={14} color="#A4B1A8" />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </Screen>
  );
}
