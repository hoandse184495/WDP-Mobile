import { useMutation } from '@tanstack/react-query';
import { apiClient, requestData } from '@/core/network/api-client';
import { useSession } from '@/features/auth/stores/session-store';
import { useRefreshTask } from '../hooks/use-tasks';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ui, colors } from '@/core/theme/theme';
import { Button, Card, Choice, Empty, Failure, Loading } from '@/shared/components/ui';
import { useTelemetry } from '../hooks/use-telemetry';
import { ResponseSummary } from '@/features/operations/components/response-summary';
export function TaskTelemetry({ id }: { id: string }) {
  const query = useTelemetry(id);
  const role = useSession((state) => state.user?.role);
  const refresh = useRefreshTask(id);
  const stop = useMutation({
    mutationFn: () =>
      requestData(apiClient.post('/daily-tasks/' + encodeURIComponent(id) + '/telemetry/stop', {})),
    onSuccess: async () => {
      await query.refetch();
      await refresh();
    },
  });
  const [metric, setMetric] = useState('heartRate');
  const [selected, setSelected] = useState<number | null>(null);
  const run = query.data?.run;
  const samples = run?.samples ?? [];
  const max = Math.max(
    1,
    ...samples.map((row) => (metric === 'heartRate' ? row.heartRate : row.speed)),
  );
  return (
    <Card>
      <Text style={ui.heading}>Theo dõi buổi tập</Text>
      <Text style={ui.muted}>
        {query.liveStatus === 'connected'
          ? 'Đang nhận dữ liệu trực tiếp'
          : query.liveStatus === 'denied'
            ? 'Không còn quyền theo dõi'
            : query.liveStatus === 'paused'
              ? 'Cập nhật đang tạm dừng'
              : 'Đang kết nối cập nhật trực tiếp…'}
      </Text>
      <Text style={ui.muted}>
        Dữ liệu mô phỏng phần mềm, không phải thiết bị đo. Kết quả được hệ thống ghi nhận và chốt
        theo lượt mô phỏng.
      </Text>
      {query.data?.run?.status === 'running' &&
        ['club_manager', 'head_trainer', 'groom'].includes(role ?? '') && (
          <Button
            danger
            title="Dừng khẩn cấp và chốt số liệu"
            busy={stop.isPending}
            onPress={() => stop.mutate()}
          />
        )}
      {stop.error && <Failure error={stop.error} />}
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : !run ? (
        <Empty label="Chưa có lượt mô phỏng" />
      ) : (
        <>
          <Text style={ui.body}>
            {run.status} · {run.totalSamples} mẫu
          </Text>
          <Choice
            label="Chỉ số"
            value={metric}
            onChange={setMetric}
            options={[
              { value: 'heartRate', label: 'Nhịp tim (bpm)' },
              { value: 'speed', label: 'Vận tốc (m/s)' },
            ]}
          />
          <View style={{ height: 130, flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
            {samples.map((row, index) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mẫu ${index + 1}`}
                onPress={() => setSelected(index)}
                key={index}
                style={{
                  flex: 1,
                  minHeight: 3,
                  height: Math.max(
                    3,
                    (110 * (metric === 'heartRate' ? row.heartRate : row.speed)) / max,
                  ),
                  backgroundColor: selected === index ? colors.gold : colors.primary,
                  borderRadius: 2,
                }}
              />
            ))}
          </View>
          {selected !== null && samples[selected] && (
            <Text style={ui.body}>
              {samples[selected].elapsedSeconds}s ·{' '}
              {metric === 'heartRate' ? samples[selected].heartRate : samples[selected].speed}{' '}
              {metric === 'heartRate' ? 'bpm' : 'm/s'}
            </Text>
          )}
          <ResponseSummary
            data={{ summary: run.summary, alerts: run.alerts, reason: run.reason }}
          />
        </>
      )}
    </Card>
  );
}
