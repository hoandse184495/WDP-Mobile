import { ClinicalRecordCard, ClinicalScheduleCard } from './clinical-cards';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Card, Detail } from '@/shared/components/ui';
import { ui } from '@/core/theme/theme';
import { asRecord } from '@/features/operations/types/operation';
import { choiceLabel } from '@/features/operations/contracts/labels';
import { typeLabels, statusLabels, feedingOutcomeLabels } from '@/features/tasks/types/task';
import { journalStamp, type JournalEntry as Entry } from '../utils/care-journal';
import { JournalPhoto } from './journal-photo';
export function JournalEntry({ entry, reload }: { entry: Entry; reload: () => void }) {
  const [expanded, setExpanded] = useState(false);
  if (entry.kind === 'clinical') return <ClinicalRecordCard record={entry.record} />;
  if (entry.kind === 'care') return <ClinicalScheduleCard schedule={entry.record} />;
  const row = entry.record;
  const title = entry.kind === 'task' ? entry.record.title : entry.record.plan?.title || 'Buổi tập';
  return (
    <Card>
      <Text style={ui.muted}>{journalStamp(entry.time)}</Text>
      <Text style={ui.heading}>{title}</Text>
      <Badge
        label={statusLabels[row.status as keyof typeof statusLabels] ?? choiceLabel(row.status)}
        danger={row.status === 'cancelled'}
      />
      <Text style={ui.muted}>
        {entry.kind === 'task'
          ? (typeLabels[entry.record.type as keyof typeof typeLabels] ?? 'Chăm sóc') +
            ' · ' +
            (entry.record.groom?.fullName || 'Chưa ghi người chăm sóc')
          : 'Huấn luyện · ' + (entry.record.trainer?.fullName || 'Chưa ghi HLV')}
      </Text>
      <Button
        secondary
        title={expanded ? 'Thu gọn hoạt động' : 'Xem chi tiết hoạt động'}
        onPress={() => setExpanded(!expanded)}
      />
      {expanded &&
        (entry.kind === 'task' ? (
          <>
            <Detail label="Dự kiến" value={journalStamp(entry.record.scheduledStartAt)} />
            <Detail label="Bắt đầu thực tế" value={journalStamp(entry.record.actualStartAt)} />
            <Detail label="Kết thúc thực tế" value={journalStamp(entry.record.actualEndAt)} />
            {entry.record.stall?.code && (
              <Detail label="Ô chuồng" value={entry.record.stall.code} />
            )}
            {entry.record.feedingOutcome && (
              <Detail
                label="Kết quả bữa ăn"
                value={
                  feedingOutcomeLabels[
                    entry.record.feedingOutcome as keyof typeof feedingOutcomeLabels
                  ] ?? entry.record.feedingOutcome
                }
              />
            )}
            {entry.record.feedingSnapshot && (
              <Detail
                label="Khẩu phần"
                value={String(
                  entry.record.feedingSnapshot.title ??
                    asRecord(entry.record.feedingSnapshot.meal).name ??
                    'Đã ghi khẩu phần',
                )}
              />
            )}
            {entry.record.feedingLeftovers?.map((leftover, i) => (
              <View key={i}>
                <Detail
                  label={'Phần thừa · ' + (leftover.name || 'Vật tư')}
                  value={
                    leftover.quantity == null
                      ? 'Chưa xác định'
                      : leftover.quantity + ' ' + (leftover.unit ?? '')
                  }
                />
                <Text style={ui.muted}>
                  {choiceLabel(leftover.measurement ?? 'unknown')} ·{' '}
                  {choiceLabel(leftover.disposition ?? 'none')}
                </Text>
              </View>
            ))}
            {!!entry.record.instructions && (
              <Detail label="Hướng dẫn" value={entry.record.instructions} />
            )}
            {!!entry.record.completionNotes && (
              <Detail label="Ghi nhận" value={entry.record.completionNotes} />
            )}
            {!entry.record.photos.length && <Text style={ui.muted}>Chưa có ảnh hoạt động.</Text>}
            {entry.record.photos.map((photo) => (
              <JournalPhoto key={photo._id + '-' + photo.url} photo={photo} reload={reload} />
            ))}
          </>
        ) : (
          <>
            {(
              [
                ['Cự ly (m)', entry.record.distanceCompleted],
                ['Thời lượng (phút)', entry.record.durationMinutes],
                ['Vận tốc trung bình (m/s)', entry.record.avgSpeed],
                ['Vận tốc tối đa (m/s)', entry.record.maxSpeed],
                ['Nhịp tim trung bình (bpm)', entry.record.avgHeartRate],
                ['Nhịp tim tối đa (bpm)', entry.record.maxHeartRate],
                ['Đánh giá / 5', entry.record.performanceRating],
              ] as const
            ).map(([label, value]) => (
              <Detail key={label} label={label} value={value} />
            ))}
            {!!entry.record.groom?.fullName && (
              <Detail label="Groom" value={entry.record.groom.fullName} />
            )}
            {!!entry.record.trainerNotes && (
              <Detail label="Nhận xét HLV" value={entry.record.trainerNotes} />
            )}
            {!!entry.record.groomNotes && (
              <Detail label="Ghi chú chăm sóc" value={entry.record.groomNotes} />
            )}
          </>
        ))}
    </Card>
  );
}
