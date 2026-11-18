import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ui } from '@/core/theme/theme';
import { taskRoles } from '@/core/constants/roles';
import { formatDate, formatTime } from '@/core/utils/date';
import {
  Button,
  Badge,
  Card,
  Choice,
  Detail,
  Failure,
  Field,
  Loading,
  Screen,
} from '@/shared/components/ui';
import { RoleGuard } from '@/shared/components/role-guard';
import { referenceId, referenceName } from '@/shared/types/api';
import { useSession } from '@/features/auth/stores/session-store';
import { useTask, useRefreshTask } from '../hooks/use-tasks';
import { taskApi } from '../api/task-api';
import { statusLabels, typeLabels, feedingOutcomeLabels } from '../types/task';
import { TaskEvidence } from './task-evidence';
import { TaskFinishForm } from './task-finish-form';
import type { StartInput } from '../schemas/task-schema';
import { cancelSchema } from '../schemas/task-schema';
import { AppError } from '@/core/errors/app-error';
import { OperationPanel } from '@/features/operations/components/operation-panel';
import { TaskTelemetry } from './task-telemetry';
export function TaskDetail({ id }: { id: string }) {
  const query = useTask(id);
  const user = useSession((state) => state.user);
  const refresh = useRefreshTask(id);
  const [reason, setReason] = useState('');
  const [scenario, setScenario] = useState<NonNullable<StartInput['scenario']>>('normal');
  const start = useMutation({
    mutationFn: () => taskApi.start(id, query.data?.type === 'training' ? { scenario } : {}),
    onSuccess: refresh,
    onError: refresh,
  });
  const cancel = useMutation({
    mutationFn: () => {
      const result = cancelSchema.safeParse({ reason });
      if (!result.success) throw new AppError('Nhập lý do ít nhất 3 ký tự.');
      return taskApi.cancel(id, query.data!.revision, result.data.reason);
    },
    onSuccess: refresh,
    onError: refresh,
  });
  if (!query.data)
    return (
      <Screen>
        {query.isPending ? (
          <Loading />
        ) : (
          <Failure error={query.error} retry={() => void query.refetch()} />
        )}
      </Screen>
    );
  const task = query.data;
  const own = user?.role === 'groom' && referenceId(task.groomId) === user._id;
  const manage =
    !task.medicalScheduleId &&
    (user?.role === 'club_manager' || (user?.role === 'head_trainer' && task.type === 'training'));
  const editable = own && ['scheduled', 'in_progress'].includes(task.status);
  return (
    <Screen>
      <OperationPanel module="tasks" record={task} />
      {task.type === 'training' &&
        (user?.role !== 'groom' || (own && task.status !== 'completed')) &&
        ['club_manager', 'head_trainer', 'groom'].includes(user?.role ?? '') && (
          <TaskTelemetry id={id} />
        )}
      <Text style={ui.title}>{task.title}</Text>
      <Badge label={statusLabels[task.status]} />
      {user?.role === 'groom' && task.status === 'completed' && (
        <Text style={ui.muted}>
          Lịch sử đã hoàn thành · Người thực hiện: {referenceName(task.groomId)}. Kết quả và ảnh
          bằng chứng chỉ đọc.
        </Text>
      )}
      <Card>
        <Detail label="Loại công việc" value={typeLabels[task.type]} />
        <Detail label="Ngựa / ô chuồng" value={referenceName(task.horseId ?? task.stallId)} />
        <Detail label="Groom" value={referenceName(task.groomId)} />
        <Detail
          label="Dự kiến (giờ Việt Nam)"
          value={`${formatDate(task.scheduledStartAt)} · ${formatTime(task.scheduledStartAt)} – ${formatTime(task.scheduledEndAt)}`}
        />
        <Detail
          label="Bắt đầu thực tế"
          value={
            task.actualStartAt
              ? `${formatDate(task.actualStartAt)} ${formatTime(task.actualStartAt)}`
              : undefined
          }
        />
        <Detail
          label="Kết thúc thực tế"
          value={
            task.actualEndAt
              ? `${formatDate(task.actualEndAt)} ${formatTime(task.actualEndAt)}`
              : undefined
          }
        />
        <Detail label="Hướng dẫn" value={task.instructions} />
      </Card>
      {task.trainingSnapshot && (
        <Card>
          <Text style={ui.heading}>Bài tập đã giao</Text>
          <Detail label="Bài tập" value={task.trainingSnapshot.title} />
          <Detail label="Quãng đường (m)" value={task.trainingSnapshot.distance} />
          <Detail label="Ngưỡng tốc độ (m/s)" value={task.trainingSnapshot.targetSpeedMax} />
          <Detail label="Ngưỡng nhịp tim (bpm)" value={task.trainingSnapshot.targetHeartRateMax} />
          <Detail label="Hướng dẫn" value={task.trainingSnapshot.instructions} />
        </Card>
      )}
      {task.feedingSnapshot && (
        <Card>
          <Text style={ui.heading}>{task.feedingSnapshot.meal.name}</Text>
          {task.feedingSnapshot.meal.lines.map((line, i) => (
            <Text key={i} style={ui.body}>
              {line.name}: {line.quantity} {line.unit}
            </Text>
          ))}
        </Card>
      )}
      {(task.blockedReason || task.startBlockedReason) && (
        <Text style={ui.error}>{task.blockedReason || task.startBlockedReason}</Text>
      )}
      {own && task.status === 'scheduled' && task.type === 'training' && (
        <Choice
          label="Kịch bản mô phỏng khi bắt đầu tập"
          value={scenario}
          onChange={setScenario}
          options={[
            { value: 'normal', label: 'Bình thường' },
            { value: 'heart_rate', label: 'Cảnh báo nhịp tim' },
            { value: 'speed', label: 'Cảnh báo tốc độ' },
            { value: 'both', label: 'Cả hai cảnh báo' },
          ]}
        />
      )}
      {own && task.status === 'scheduled' && (
        <Button
          title={
            task.type === 'training' ? 'Bắt đầu tập & mô phỏng' : 'Bắt đầu công việc (tùy chọn)'
          }
          busy={start.isPending}
          disabled={Boolean(task.blockedReason || task.startBlockedReason)}
          onPress={() => start.mutate()}
        />
      )}
      {start.error && <Failure error={start.error} />}
      {['club_manager', 'head_trainer', 'groom'].includes(user?.role ?? '') && (
        <TaskEvidence id={id} editable={editable} />
      )}
      {editable && <TaskFinishForm task={task} />}
      {task.status === 'completed' && (
        <Card>
          {task.feedingOutcome && (
            <Detail label="Kết quả bữa ăn" value={feedingOutcomeLabels[task.feedingOutcome]} />
          )}
          {task.acknowledgedRationChange && (
            <Text style={ui.muted}>
              Đã xác nhận khẩu phần thay đổi/hết hiệu lực khi ghi nhận bữa ăn.
            </Text>
          )}
          <Detail label="Ghi chú hoàn thành" value={task.completionNotes} />
        </Card>
      )}
      {['scheduled', 'in_progress'].includes(task.status) && manage && (
        <Card>
          <Field
            label="Lý do / trở ngại"
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={1000}
          />
          {manage && (
            <Button
              danger
              title="Hủy công việc"
              busy={cancel.isPending}
              onPress={() =>
                Alert.alert('Hủy công việc?', 'Thao tác sẽ lưu lý do vào lịch sử.', [
                  { text: 'Quay lại', style: 'cancel' },
                  { text: 'Hủy công việc', style: 'destructive', onPress: () => cancel.mutate() },
                ])
              }
            />
          )}
          {cancel.error && <Failure error={cancel.error} />}
        </Card>
      )}
      {own && ['scheduled', 'in_progress'].includes(task.status) && (
        <Button
          secondary
          title="Báo sự cố ảnh hưởng công việc"
          onPress={() =>
            router.push({
              pathname: '/incident-editor',
              params: {
                taskId: id,
                ...(referenceId(task.horseId)
                  ? { horseId: referenceId(task.horseId) }
                  : { stallId: referenceId(task.stallId) }),
              },
            })
          }
        />
      )}
      <Button secondary title="Làm mới công việc" onPress={() => void refresh()} />
    </Screen>
  );
}
export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RoleGuard roles={taskRoles}>
      <TaskDetail id={id} />
    </RoleGuard>
  );
}
