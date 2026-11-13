import { useMutation } from '@tanstack/react-query';
import { Text } from 'react-native';
import { apiClient, requestData } from '@/core/network/api-client';
import { AppError } from '@/core/errors/app-error';
import { Button, Card, Failure } from '@/shared/components/ui';
import { JsonRecord } from '@/features/operations/types/operation';
import { ResponseSummary } from '@/features/operations/components/response-summary';
import { ui } from '@/core/theme/theme';
export function ReplenishmentDemand({ payload }: { payload: JsonRecord }) {
  const input = {
    warehouseId: payload.warehouseId || undefined,
    taskId: payload.taskId || undefined,
    itemId: payload.itemId,
  };
  const fingerprint = JSON.stringify(input);
  const query = useMutation({
    mutationFn: async () => {
      if (!input.itemId || Boolean(input.taskId) === Boolean(input.warehouseId))
        throw new AppError('Chọn vật tư và một kho hoặc một công việc để tính nhu cầu.');
      return {
        fingerprint,
        data: await requestData(
          apiClient.get('/inventory/replenishments/preview', { params: input }),
        ),
      };
    },
  });
  return (
    <Card>
      <Text style={ui.heading}>Nhu cầu bổ sung</Text>
      <Button
        title="Tính nhu cầu và tồn khả dụng"
        secondary
        busy={query.isPending}
        onPress={() => query.mutate()}
      />
      {query.error && <Failure error={query.error} />}
      {query.data && (
        <>
          {query.data.fingerprint !== fingerprint ? (
            <Text style={ui.muted}>Lựa chọn đã thay đổi, hãy tính lại nhu cầu.</Text>
          ) : (
            <ResponseSummary data={query.data.data} />
          )}
        </>
      )}
    </Card>
  );
}
