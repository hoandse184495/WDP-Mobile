import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/providers/app-providers';
import { useSession } from '@/features/auth/stores/session-store';
import { SessionBootstrap } from '@/features/auth/components/session-bootstrap';
import { colors } from '@/core/theme/theme';
function Navigation() {
  const status = useSession((state) => state.status);
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.canvas },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerTitleStyle: { fontSize: 16, fontWeight: '600' },
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Protected guard={status === 'guest'}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={status === 'authenticated'}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="horses/[id]" options={{ title: 'Hồ sơ ngựa' }} />
          <Stack.Screen name="health-dossier" options={{ title: 'Hồ sơ sức khỏe' }} />
          <Stack.Screen name="medicine-cabinet" options={{ title: 'Tủ thuốc thú y' }} />
          <Stack.Screen name="care-journal" options={{ title: 'Nhật ký chăm sóc' }} />
          <Stack.Screen name="horse-editor" options={{ title: 'Hồ sơ ngựa' }} />
          <Stack.Screen name="tasks/[id]" options={{ title: 'Công việc' }} />
          <Stack.Screen name="task-schedule" options={{ title: 'Giao công việc' }} />
          <Stack.Screen name="workspace/[module]" options={{ title: 'Không gian làm việc' }} />
          <Stack.Screen name="records/[module]/[id]" options={{ title: 'Chi tiết hồ sơ' }} />
          <Stack.Screen name="notifications" options={{ title: 'Thông báo' }} />
          <Stack.Screen name="notification-tasks/[id]" options={{ title: 'Đợt công việc' }} />
          <Stack.Screen name="training-editor" options={{ title: 'Giáo án' }} />
          <Stack.Screen name="session-review/[id]" options={{ title: 'Đánh giá buổi tập' }} />
          <Stack.Screen name="incident-editor" options={{ title: 'Báo cáo sự cố' }} />
          <Stack.Screen name="stock/[id]" options={{ title: 'Tồn kho' }} />
          <Stack.Screen name="ledger" options={{ title: 'Sổ kho' }} />
          <Stack.Screen name="stock-ledger" options={{ title: 'Sổ kho' }} />
          <Stack.Screen name="operations/[operation]" options={{ title: 'Thao tác nghiệp vụ' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
export default function RootLayout() {
  return (
    <AppProviders>
      <SessionBootstrap>
        <Navigation />
      </SessionBootstrap>
    </AppProviders>
  );
}
