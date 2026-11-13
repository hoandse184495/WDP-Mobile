import { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ui } from '@/core/theme/theme';
import { AppError } from '@/core/errors/app-error';
import { useSession } from '@/features/auth/stores/session-store';
import { Screen, ScreenHeader, Choice, Card, Detail, Button } from '@/shared/components/ui';
import { PagedList } from '@/shared/components/paged-list';
import { RoleGuard } from '@/shared/components/role-guard';
import { objectId } from '@/shared/types/api';
import { formatDate } from '@/core/utils/date';
import { choiceLabel } from '@/features/operations/contracts/labels';
import { SurfaceLocationField } from '@/features/medical/components/surface-location-field';
import { dossierApi } from '../api/health-dossier-api';
import {
  clinicalRoles,
  type HealthDossier,
  type ClinicalRecord,
  type ClinicalSchedule,
} from '../types/health-dossier';
import { ClinicalRecordCard, ClinicalScheduleCard } from './clinical-cards';
type Entry = {
  id: string;
  date: string;
  record?: ClinicalRecord;
  schedule?: ClinicalSchedule;
  injury?: HealthDossier['injuries'][number];
};
function Dossier() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession((s) => s.user)!;
  const [group, setGroup] = useState('all');
  const valid = objectId.safeParse(id).success;
  const query = useQuery({
    queryKey: ['horse-health-dossier', user._id, user.role, id],
    queryFn: ({ signal }) => dossierApi.get(id, signal),
    enabled: valid,
    retry: false,
  });
  const data = query.error ? undefined : query.data;
  const entries: Entry[] =
    data && !data.restricted
      ? [
          ...(['all', 'records'].includes(group)
            ? data.records.map((record) => ({
                id: 'record-' + record._id,
                date: record.examinationDate,
                record,
              }))
            : []),
          ...(['all', 'schedules'].includes(group)
            ? data.schedules.map((schedule) => ({
                id: 'schedule-' + schedule._id,
                date:
                  schedule.administration?.performedOn || schedule.completedAt || schedule.dueDate,
                schedule,
              }))
            : []),
          ...(['all', 'injuries'].includes(group)
            ? data.injuries.map((injury) => ({
                id: 'injury-' + injury._id,
                date: injury.injuryDate || '',
                injury,
              }))
            : []),
        ].sort((a, b) => b.date.localeCompare(a.date))
      : [];
  return (
    <Screen scroll={false}>
      <PagedList
        items={entries}
        getId={(entry) => entry.id}
        pending={valid && query.isPending}
        error={!valid ? new AppError('Mã ngựa không hợp lệ.') : query.error}
        refreshing={query.isFetching}
        refresh={() => {
          if (valid) void query.refetch();
        }}
        loadingMore={false}
        loadMore={() => {}}
        emptyLabel={
          data?.restricted ? 'Hồ sơ chi tiết chưa được mở.' : 'Chưa có dữ liệu sức khỏe phù hợp.'
        }
        header={
          <View style={{ gap: 12, marginBottom: 16 }}>
            <ScreenHeader
              title="Hồ sơ sức khỏe"
              subtitle={
                data
                  ? data.horse.name + ' · ' + data.horse.registrationCode
                  : 'Lần khám, chăm sóc y tế và chấn thương'
              }
            />
            {data?.restricted ? (
              <Text style={ui.muted}>{data.restrictionReason}</Text>
            ) : (
              data && (
                <>
                  <Text style={ui.muted}>
                    {data.records.length} lần khám · {data.schedules.length} lịch chăm sóc ·{' '}
                    {data.injuries.length} chấn thương
                  </Text>
                  <Choice
                    label="Nhóm hồ sơ"
                    value={group}
                    onChange={setGroup}
                    options={[
                      { value: 'all', label: 'Tất cả' },
                      { value: 'records', label: 'Lần khám và thuốc' },
                      { value: 'schedules', label: 'Lịch chăm sóc y tế' },
                      { value: 'injuries', label: 'Chấn thương' },
                    ]}
                  />
                </>
              )
            )}
          </View>
        }
        renderItem={(entry) =>
          entry.record ? (
            <ClinicalRecordCard record={entry.record} />
          ) : entry.schedule ? (
            <ClinicalScheduleCard schedule={entry.schedule} />
          ) : (
            <InjuryCard injury={entry.injury!} horseId={id} />
          )
        }
      />
    </Screen>
  );
}
function InjuryCard({
  injury,
  horseId,
}: {
  injury: HealthDossier['injuries'][number];
  horseId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Text style={ui.heading}>
        {injury.affectedArea || 'Chấn thương'} · {choiceLabel(injury.status || '')}
      </Text>
      <Text style={ui.muted}>
        {formatDate(injury.injuryDate)} · {choiceLabel(injury.severity || '')}
      </Text>
      <Button
        secondary
        title={open ? 'Thu gọn chấn thương' : 'Xem chấn thương'}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Detail label="Mô tả" value={injury.description} />
          <Detail label="Điều trị" value={injury.treatmentPlan} />
          <Detail label="Kết luận hồi phục" value={injury.resolvedNotes} />
          {injury.surfaceLocation && (
            <SurfaceLocationField
              horseId={horseId}
              value={injury.surfaceLocation}
              editable={false}
            />
          )}
        </>
      )}
    </Card>
  );
}
export default function HealthDossierScreen() {
  return (
    <RoleGuard roles={clinicalRoles}>
      <Dossier />
    </RoleGuard>
  );
}
