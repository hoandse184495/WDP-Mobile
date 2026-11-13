import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';
import { ui } from '@/core/theme/theme';
import { Button, Card, Choice, Failure, Field } from '@/shared/components/ui';
import { AppError } from '@/core/errors/app-error';
import { Task } from '../types/task';
import { FinishInput, finishSchema } from '../schemas/task-schema';
import { taskApi } from '../api/task-api';
import { useRefreshTask } from '../hooks/use-tasks';
import { useTelemetry } from '../hooks/use-telemetry';
type MeasureKey =
  'distanceCompleted' | 'durationMinutes' | 'maxSpeed' | 'avgHeartRate' | 'maxHeartRate';
const measurementFields: { key: MeasureKey; label: string }[] = [
  { key: 'distanceCompleted', label: 'Quãng đường (m)' },
  { key: 'durationMinutes', label: 'Thời lượng (phút)' },
  { key: 'maxSpeed', label: 'Tốc độ tối đa (m/s)' },
  { key: 'avgHeartRate', label: 'Nhịp tim trung bình (bpm)' },
  { key: 'maxHeartRate', label: 'Nhịp tim tối đa (bpm)' },
];
export function TaskFinishForm({ task }: { task: Task }) {
  const telemetry = useTelemetry(task._id, task.type === 'training');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<NonNullable<FinishInput['feedingOutcome']> | ''>('');
  const [ack, setAck] = useState('no');
  const [measurements, setMeasurements] = useState<Record<MeasureKey, string>>({
    distanceCompleted: '',
    durationMinutes: '',
    maxSpeed: '',
    avgHeartRate: '',
    maxHeartRate: '',
  });
  const refresh = useRefreshTask(task._id);
  const evidence = useQuery({
    queryKey: ['evidence', task._id],
    queryFn: ({ signal }) => taskApi.evidence(task._id, signal),
  });
  const blocked = task.blockedReason || task.startBlockedReason;
  const mutation = useMutation({
    mutationFn: async () => {
      if (blocked) throw new AppError(blocked);
      if (!evidence.data?.photos.length)
        throw new AppError('Tải lên ít nhất 1 ảnh bằng chứng trước khi hoàn thành.');
      if (task.type === 'training' && (!telemetry.data || telemetry.data.run?.status === 'running'))
        throw new AppError('Tải trạng thái và dừng mô phỏng trước khi hoàn thành.');
      const input: FinishInput = { notes };
      if (task.type === 'training' && !telemetry.data?.run)
        input.measurements = {
          distanceCompleted: Number(measurements.distanceCompleted),
          durationMinutes: Number(measurements.durationMinutes),
          maxSpeed: Number(measurements.maxSpeed),
          avgHeartRate: Number(measurements.avgHeartRate),
          maxHeartRate: Number(measurements.maxHeartRate),
        };
      if (task.type === 'feeding' && task.feedingSnapshot) {
        if (!outcome) throw new AppError('Chọn tình trạng ăn thực tế trước khi hoàn thành.');
        if (task.feedingReviewRequired && ack !== 'yes')
          throw new AppError('Cần xác nhận khẩu phần đã thay đổi hoặc hết hiệu lực.');
        if ((outcome !== 'normal' || ack === 'yes') && !notes.trim())
          throw new AppError('Nhập ghi chú cho tình trạng ăn bất thường hoặc thay đổi khẩu phần.');
        input.feedingOutcome = outcome;
        input.acknowledgeRationChange = ack === 'yes';
      }
      const parsed = finishSchema.safeParse(input);
      if (!parsed.success)
        throw new AppError(
          parsed.error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('\n'),
        );
      return taskApi.finish(task._id, parsed.data);
    },
    onSuccess: refresh,
    onError: refresh,
  });
  return (
    <Card>
      <Text style={ui.heading}>Hoàn thành công việc</Text>
      {task.status === 'scheduled' && (
        <Text style={ui.muted}>Có thể nộp bằng chứng và hoàn thành trực tiếp theo checklist.</Text>
      )}
      {task.type === 'training' && Boolean(telemetry.data?.run) && (
        <Text style={ui.muted}>
          Kết quả sử dụng số liệu mô phỏng đã chốt. Hãy dừng mô phỏng trước khi hoàn thành.
        </Text>
      )}
      {task.type === 'training' && !telemetry.data?.run && (
        <>
          <Text style={ui.muted}>
            Nhập số đo thực tế, không dùng ngưỡng mục tiêu thay kết quả đo.
          </Text>
          {measurementFields.map((field) => (
            <Field
              key={field.key}
              label={field.label}
              keyboardType="decimal-pad"
              value={measurements[field.key]}
              onChangeText={(value) => setMeasurements((old) => ({ ...old, [field.key]: value }))}
            />
          ))}
        </>
      )}
      {task.type === 'feeding' && task.feedingSnapshot && (
        <>
          <Choice
            label="Kết quả bữa ăn"
            value={outcome}
            onChange={setOutcome}
            options={[
              { value: 'normal', label: 'Bình thường' },
              { value: 'partial', label: 'Ăn ít' },
              { value: 'refused', label: 'Bỏ ăn' },
              { value: 'not_fed', label: 'Không cho ăn' },
            ]}
          />
          {task.feedingReviewRequired && (
            <Choice
              label="Khẩu phần đã thay đổi/hết hiệu lực. Chỉ ghi nhận việc đã xảy ra."
              value={ack}
              onChange={setAck}
              options={[
                { value: 'no', label: 'Chưa xác nhận' },
                { value: 'yes', label: 'Xác nhận và ghi rõ bên dưới' },
              ]}
            />
          )}
          <Text style={ui.muted}>
            Kết quả bữa ăn không xác nhận đã xuất kho. Xem phiếu xuất riêng để đối chiếu vật tư.
          </Text>
        </>
      )}
      <Field
        label="Ghi chú kết quả"
        multiline
        value={notes}
        onChangeText={setNotes}
        maxLength={1000}
      />
      {blocked && <Text style={ui.error}>{blocked}</Text>}
      {telemetry.error && task.type === 'training' && (
        <Failure error={telemetry.error} retry={() => void telemetry.refetch()} />
      )}
      {evidence.error && <Failure error={evidence.error} retry={() => void evidence.refetch()} />}
      {mutation.error && <Failure error={mutation.error} />}
      <Button
        title="Xác nhận hoàn thành"
        busy={mutation.isPending}
        disabled={
          Boolean(blocked) ||
          !evidence.data?.photos.length ||
          (task.type === 'training' &&
            (!telemetry.data || telemetry.data.run?.status === 'running'))
        }
        onPress={() => mutation.mutate()}
      />
    </Card>
  );
}
