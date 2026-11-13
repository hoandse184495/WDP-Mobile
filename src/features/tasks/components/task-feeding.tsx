import { useState } from 'react';
import * as Crypto from 'expo-crypto';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';
import { ui } from '@/core/theme/theme';
import { Button, Card, Choice, Failure, Loading } from '@/shared/components/ui';
import { Task } from '../types/task';
import { taskApi } from '../api/task-api';
import { useRefreshTask } from '../hooks/use-tasks';
export function TaskFeeding({ task, editable }: { task: Task; editable: boolean }) {
  const query = useQuery({
    queryKey: ['feeding', task._id],
    queryFn: ({ signal }) => taskApi.feedingPreview(task._id, signal),
  });
  const refresh = useRefreshTask(task._id);
  const [ack, setAck] = useState('no');
  const [requestKey] = useState(() => Crypto.randomUUID());
  const mutation = useMutation({
    mutationFn: () =>
      taskApi.issueFeed(task._id, {
        revision: task.revision,
        requestKey,
        previewHash: query.data!.previewHash!,
        acknowledgeUnknownExpiry: ack === 'yes',
      }),
    onSuccess: refresh,
    onError: refresh,
  });
  return (
    <Card>
      <Text style={ui.heading}>Xuất thức ăn</Text>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : (
        query.data && (
          <>
            {query.data.issue ? (
              <Text style={ui.body}>Đã xuất: {query.data.issue.number}</Text>
            ) : (
              <>
                <Text style={ui.muted}>Kho: {query.data.warehouse?.name ?? 'Chưa xác định'}</Text>
                {query.data.requirements.map((row) => (
                  <Text style={ui.body} key={row.itemId}>
                    {row.name}: cần {row.required} {row.unit} · có {row.available}
                    {row.shortage > 0 ? ` · thiếu ${row.shortage}` : ''}
                  </Text>
                ))}
                {query.data.lines.map((row, i) => (
                  <Text style={ui.muted} key={i}>
                    {row.name}: {row.quantity} {row.unit} · HSD {row.expiresOn ?? 'Chưa khai báo'}
                  </Text>
                ))}
                {query.data.blockedReason ? (
                  <Text style={ui.error}>{query.data.blockedReason}</Text>
                ) : null}
                {editable && query.data.canIssue && (
                  <>
                    {query.data.lines.some((line) => !line.expiresOn) && (
                      <Choice
                        label="Có lô chưa khai HSD. Quy trình CLB cho phép sử dụng?"
                        value={ack}
                        onChange={setAck}
                        options={[
                          { value: 'no', label: 'Chưa xác nhận' },
                          { value: 'yes', label: 'Tôi đã kiểm tra, được phép' },
                        ]}
                      />
                    )}
                    <Button
                      title="Xác nhận xuất theo đề xuất"
                      busy={mutation.isPending}
                      onPress={() => mutation.mutate()}
                    />
                  </>
                )}
              </>
            )}
            <Button secondary title="Tải lại đề xuất" onPress={() => void query.refetch()} />
          </>
        )
      )}
      {mutation.error && <Failure error={mutation.error} />}
    </Card>
  );
}
