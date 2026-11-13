import { useNotificationStream } from '@/features/notifications/hooks/use-notification-stream';
import { PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/core/network/query-client';
import { useSessionLifecycle } from '@/features/auth/hooks/use-session-lifecycle';

function SessionLifecycle() {
  useSessionLifecycle();
  useNotificationStream();
  return null;
}
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionLifecycle />
        {children}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
