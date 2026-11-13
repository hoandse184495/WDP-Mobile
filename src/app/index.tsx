import { Redirect } from 'expo-router';
import { useSession } from '@/features/auth/stores/session-store';
export default function Index() {
  const status = useSession((state) => state.status);
  return <Redirect href={status === 'authenticated' ? '/(tabs)' : '/(auth)/login'} />;
}
