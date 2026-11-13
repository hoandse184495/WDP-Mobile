import { Stack } from 'expo-router/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/theme';
export default function AuthLayout() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}
