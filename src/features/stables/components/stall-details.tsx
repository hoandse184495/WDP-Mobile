import { HorseTrainingActions } from '@/features/horses/components/training-hold';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { ui } from '@/core/theme/theme';
import { formatDate, formatTime } from '@/core/utils/date';
import { taskRoles } from '@/core/constants/roles';
import { useSession } from '@/features/auth/stores/session-store';
import { asRecord, entityId, type JsonRecord } from '@/features/operations/types/operation';
import { Card, Detail, Button, Badge } from '@/shared/components/ui';
import { displayValue } from '@/features/workspace/components/record-details';
import { typeLabels, statusLabels } from '@/features/tasks/types/task';
function stamp(value: unknown) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? formatDate(value) + ' ' + formatTime(value)
    : '—';
}
export function StallDetails({ record }: { record: JsonRecord }) {
  const user = useSession((state) => state.user);
  const [historyOpen, setHistoryOpen] = useState(false);
  const details = asRecord(record._details),
    occupancy = asRecord(details.occupancy),
    horse = asRecord(occupancy.horseId);
  const tasks = Array.isArray(details.tasks) ? details.tasks.map(asRecord) : [];
  const history = Array.isArray(details.history) ? details.history.map(asRecord) : [];
  const horseId = entityId(horse);
  return (
    <>
      <Card>
        <Text style={ui.heading}>Ngựa đang lưu trú</Text>
        {horseId ? (
          <>
            <Detail label="Ngựa" value={displayValue(horse)} />
            <Detail label="Mã đăng ký" value={String(horse.registrationCode ?? '—')} />
            <Detail label="Groom chăm sóc" value={displayValue(details.groom)} />
            <Detail label="Vào ô lúc" value={stamp(occupancy.startedAt)} />
            {horse.isTrainingLocked === true && <Badge label="Khóa huấn luyện" danger />}
            {!!horse.trainingLockReason && (
              <Text style={ui.error}>{String(horse.trainingLockReason)}</Text>
            )}
            <HorseTrainingActions horse={horse} />
            <Button
              title="Mở hồ sơ ngựa"
              secondary
              onPress={() => router.push({ pathname: '/horses/[id]', params: { id: horseId } })}
            />
          </>
        ) : (
          <Text style={ui.muted}>
            {record.occupied ? 'Ô có ngựa ngoài phạm vi hồ sơ được xem.' : 'Ô hiện không có ngựa.'}
          </Text>
        )}
      </Card>
      <Card>
        <Text style={ui.heading}>Công việc trong ngày</Text>
        {tasks.length ? (
          tasks.map((task) => (
            <View key={entityId(task)} style={{ gap: 8, paddingVertical: 10 }}>
              <Text style={ui.label}>{String(task.title ?? 'Công việc')}</Text>
              <Badge
                label={
                  statusLabels[task.status as keyof typeof statusLabels] ??
                  String(task.status ?? '')
                }
              />
              <Detail
                label="Loại công việc"
                value={typeLabels[task.type as keyof typeof typeLabels] ?? String(task.type ?? '')}
              />
              <Detail label="Groom" value={displayValue(task.groomId)} />
              <Detail
                label="Dự kiến"
                value={stamp(task.scheduledStartAt) + ' – ' + stamp(task.scheduledEndAt)}
              />
              {!!task.actualStartAt && (
                <Detail label="Bắt đầu thực tế" value={stamp(task.actualStartAt)} />
              )}
              {!!task.actualEndAt && (
                <Detail label="Kết thúc thực tế" value={stamp(task.actualEndAt)} />
              )}
              {user && taskRoles.includes(user.role) && (
                <Button
                  title="Mở công việc"
                  secondary
                  onPress={() =>
                    router.push({ pathname: '/tasks/[id]', params: { id: entityId(task) } })
                  }
                />
              )}
            </View>
          ))
        ) : (
          <Text style={ui.muted}>Không có công việc trong phạm vi của bạn ngày này.</Text>
        )}
      </Card>
      {user?.role === 'club_manager' && details.historyAllowed === true && (
        <Card>
          <Button
            title={historyOpen ? 'Ẩn lịch sử lưu trú' : 'Xem lịch sử lưu trú'}
            secondary
            onPress={() => setHistoryOpen(!historyOpen)}
          />
          {historyOpen && (
            <>
              <Text style={ui.muted}>Tối đa 20 lượt gần nhất.</Text>
              {history.length ? (
                history.map((row, index) => (
                  <View
                    key={entityId(row) || String(index)}
                    style={{ gap: 6, paddingVertical: 10 }}
                  >
                    <Detail label="Ngựa" value={displayValue(row.horseId)} />
                    <Detail label="Lưu trú" value={row.isActive ? 'Đang ở' : 'Đã rời ô'} />
                    <Detail label="Vào ô" value={stamp(row.startedAt)} />
                    <Detail label="Rời ô" value={row.endedAt ? stamp(row.endedAt) : 'Hiện tại'} />
                    <Detail label="Lý do" value={String(row.reason ?? '—')} />
                    {!!row.endReason && (
                      <Detail label="Lý do rời ô" value={String(row.endReason)} />
                    )}
                  </View>
                ))
              ) : (
                <Text style={ui.muted}>Chưa có lịch sử lưu trú.</Text>
              )}
            </>
          )}
        </Card>
      )}
    </>
  );
}
