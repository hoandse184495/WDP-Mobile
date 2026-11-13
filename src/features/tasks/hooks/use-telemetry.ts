import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEventStream } from '@/core/hooks/use-event-stream';
import { AppError } from '@/core/errors/app-error';
import { z } from 'zod';
import { apiClient, requestData } from '@/core/network/api-client';
export const telemetrySchema = z.object({
  run: z
    .object({
      _id: z.string(),
      source: z.literal('simulated'),
      status: z.string(),
      scenario: z.string(),
      reason: z.string().optional(),
      totalSamples: z.number(),
      samples: z.array(
        z.object({ elapsedSeconds: z.number(), heartRate: z.number(), speed: z.number() }),
      ),
      summary: z.record(z.string(), z.number()),
      alerts: z.array(
        z.object({ code: z.string(), peak: z.number(), limit: z.number() }).passthrough(),
      ),
    })
    .nullable(),
  taskStatus: z.string(),
  serverNow: z.string(),
});
export function useTelemetry(id: string, enabled = true) {
  const client = useQueryClient();
  const liveStatus = useEventStream(
    '/daily-tasks/' + id + '/telemetry/stream',
    enabled,
    (event) => {
      if (event.type === 'telemetry')
        client.setQueryData(['telemetry', id], telemetrySchema.parse(JSON.parse(event.data)));
    },
  );
  const query = useQuery({
    queryKey: ['telemetry', id],
    queryFn: async ({ signal }) =>
      telemetrySchema.parse(
        await requestData(apiClient.get(`/daily-tasks/${id}/telemetry`, { signal })),
      ),
    enabled,
    refetchInterval: false,
  });
  return {
    ...query,
    liveStatus,
    ...(liveStatus === 'denied'
      ? {
          data: undefined,
          error: new AppError('Buổi tập không còn trong phạm vi được theo dõi.', 403),
        }
      : {}),
  };
}
