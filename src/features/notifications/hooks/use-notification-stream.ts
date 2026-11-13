import { useQueryClient } from '@tanstack/react-query';
import { useEventStream } from '@/core/hooks/use-event-stream';
export function useNotificationStream() {
  const client = useQueryClient();
  return useEventStream('/notifications/stream', true, (event) => {
    if (event.type === 'ready' || event.type === 'refresh')
      void client.invalidateQueries({ queryKey: ['notifications'] });
  });
}
