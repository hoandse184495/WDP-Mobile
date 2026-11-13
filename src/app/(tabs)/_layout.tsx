import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/core/theme/theme';
import { taskRoles } from '@/core/constants/roles';
import { useSession } from '@/features/auth/stores/session-store';
import { Icon, IconName } from '@/shared/components/icon';
function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const color = focused ? colors.primary : '#8B9890';
  return (
    <View
      style={{
        width: 46,
        height: 30,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: focused ? colors.primarySoft : 'transparent',
      }}
    >
      <Icon name={name} size={21} color={color} strokeWidth={focused ? 2 : 1.65} />
    </View>
  );
}
export default function TabLayout() {
  const user = useSession((state) => state.user);
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: '#8B9890',
          tabBarHideOnKeyboard: true,
          tabBarLabelStyle: { fontFamily, fontSize: 10, fontWeight: '600', marginTop: 3 },
          tabBarItemStyle: { paddingTop: 7 },
          tabBarStyle: {
            height: 64 + Math.max(insets.bottom, 8),
            paddingBottom: Math.max(insets.bottom, 8),
            paddingHorizontal: 7,
            backgroundColor: colors.surface,
            borderTopColor: colors.lineSoft,
            elevation: 8,
            shadowColor: colors.primaryDeep,
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Tổng quan',
            tabBarIcon: (props) => <TabIcon {...props} name="home" />,
          }}
        />
        <Tabs.Screen
          name="horses"
          options={{
            title: user?.role === 'horse_owner' ? 'Ngựa của tôi' : 'Đàn ngựa',
            href: user?.role === 'warehouse_keeper' ? null : undefined,
            tabBarIcon: (props) => <TabIcon {...props} name="horse" />,
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Công việc',
            href: user && taskRoles.includes(user.role) ? undefined : null,
            tabBarIcon: (props) => <TabIcon {...props} name="tasks" />,
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: 'Chức năng',
            tabBarIcon: (props) => <TabIcon {...props} name="grid" />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Tài khoản',
            tabBarIcon: (props) => <TabIcon {...props} name="user" />,
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
