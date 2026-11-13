import { Text } from 'react-native';
import { router } from 'expo-router';
import { Card, Detail, Button } from '@/shared/components/ui';
import { ui } from '@/core/theme/theme';
import { useSession } from '@/features/auth/stores/session-store';
import { taskRoles } from '@/core/constants/roles';
import { asRecord, entityId, type JsonRecord } from '@/features/operations/types/operation';
export function SessionDetails({ record }: { record: JsonRecord }) {
  const user = useSession((state) => state.user);
  const snapshot = asRecord(record.trainingSnapshot);
  const taskId = entityId(record.dailyTaskId);
  return (
    <Card>
      <Text style={ui.heading}>Bài tập và bằng chứng</Text>
      {Object.keys(snapshot).length ? (
        <>
          <Detail label="Bài tập đã giao" value={String(snapshot.title ?? '—')} />
          <Detail
            label="Quãng đường mục tiêu (m)"
            value={snapshot.distance as number | undefined}
          />
          <Detail
            label="Ngưỡng nhịp tim (bpm)"
            value={snapshot.targetHeartRateMax as number | undefined}
          />
          <Detail
            label="Ngưỡng tốc độ (m/s)"
            value={snapshot.targetSpeedMax as number | undefined}
          />
          <Detail label="Hướng dẫn bài tập" value={String(snapshot.instructions ?? '—')} />
        </>
      ) : (
        <Text style={ui.muted}>Kết quả lịch sử chưa có bản lưu bài tập.</Text>
      )}
      {taskId && user && taskRoles.includes(user.role) ? (
        <Button
          title="Xem công việc & ảnh bằng chứng"
          secondary
          onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: taskId } })}
        />
      ) : !taskId ? (
        <Text style={ui.muted}>Kết quả lịch sử chưa liên kết công việc.</Text>
      ) : null}
    </Card>
  );
}
