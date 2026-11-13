import { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { horseRoles } from '@/core/constants/roles';
import { ui } from '@/core/theme/theme';
import { clubDate, shiftDay } from '@/core/utils/date';
import { AppError } from '@/core/errors/app-error';
import { useSession } from '@/features/auth/stores/session-store';
import { Screen, ScreenHeader, Card, Button, Choice, Detail } from '@/shared/components/ui';
import { DateField } from '@/shared/components/date-field';
import { PagedList } from '@/shared/components/paged-list';
import { RoleGuard } from '@/shared/components/role-guard';
import { objectId } from '@/shared/types/api';
import { careJournalApi } from '../api/care-journal-api';
import {
  journalTimeline,
  journalCategories,
  validJournalDay,
  journalStamp,
  type JournalCategory,
} from '../utils/care-journal';
import { healthLabels } from '../types/horse';
import { JournalEntry } from './journal-entry';
function Journal() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    user = useSession((s) => s.user)!;
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [date, setDate] = useState(clubDate),
    [category, setCategory] = useState<JournalCategory>('all');
  const valid = objectId.safeParse(id).success && validJournalDay(date);
  const query = useQuery({
    queryKey: ['horse-care-journal', user._id, user.role, id, date],
    queryFn: ({ signal }) => careJournalApi.get(id, date, signal),
    enabled: valid,
    retry: false,
  });
  const journal = query.error ? undefined : query.data,
    summary = journal?.summary;
  const error = !valid ? new AppError('Chọn đúng ngựa và ngày nhật ký hợp lệ.') : query.error;
  return (
    <Screen scroll={false}>
      <PagedList
        items={journal ? journalTimeline(journal, category) : []}
        getId={(row) => row.id}
        renderItem={(entry) => <JournalEntry entry={entry} reload={() => void query.refetch()} />}
        pending={valid && query.isPending}
        error={error}
        refreshing={query.isFetching}
        refresh={() => {
          if (valid) void query.refetch();
        }}
        loadingMore={false}
        loadMore={() => {}}
        emptyLabel="Chưa có hoạt động phù hợp trong ngày này"
        header={
          <View style={{ gap: 12, marginBottom: 16 }}>
            <ScreenHeader
              title="Nhật ký chăm sóc"
              subtitle={journal?.horse.name ?? 'Hoạt động theo ngày của ngựa'}
            />
            <DateField label="Ngày nhật ký" value={date} onChange={setDate} />
            <View style={ui.row}>
              <Button secondary title="Hôm nay" onPress={() => setDate(clubDate())} />
              <Button secondary title="Hôm qua" onPress={() => setDate(shiftDay(clubDate(), -1))} />
            </View>
            <Choice
              label="Nhóm hoạt động"
              value={category}
              onChange={setCategory}
              options={journalCategories}
            />
            {journal && summary && (
              <Card>
                <Text style={ui.body}>
                  {summary.meals.completed}/{summary.meals.total} bữa ăn hoàn tất ·{' '}
                  {summary.training.sessionCount} buổi tập được ghi nhận
                </Text>
                <Button
                  secondary
                  title={summaryOpen ? 'Thu gọn tổng hợp' : 'Xem tổng hợp trong ngày'}
                  onPress={() => setSummaryOpen(!summaryOpen)}
                />
              </Card>
            )}
            {journal && summary && summaryOpen && (
              <>
                <Card>
                  <Detail label="Mã đăng ký" value={journal.horse.registrationCode} />
                  <Detail label="Ô chuồng" value={journal.horse.stallNumber} />
                  <Detail label="Groom phụ trách" value={journal.horse.assignedGroom?.fullName} />
                  <Detail label="HLV" value={journal.horse.trainer?.fullName} />
                </Card>
                <Card>
                  <Text style={ui.heading}>Tổng hợp trong ngày</Text>
                  <Detail
                    label="Bữa ăn hoàn tất"
                    value={summary.meals.completed + '/' + summary.meals.total}
                  />
                  <Detail
                    label="Bữa ăn gần nhất"
                    value={journalStamp(summary.meals.lastMealTime)}
                  />
                  <Detail
                    label="Vệ sinh chuồng"
                    value={
                      summary.stallCleaning.cleaned
                        ? journalStamp(summary.stallCleaning.cleanedAt)
                        : 'Chưa ghi nhận hoàn tất'
                    }
                  />
                  <Detail label="Buổi tập được ghi nhận" value={summary.training.sessionCount} />
                  <Detail label="Tổng cự ly (m)" value={summary.training.totalDistance} />
                  <Detail label="Nhịp tim trung bình (bpm)" value={summary.training.avgHeartRate} />
                  <Detail
                    label="Sức khỏe"
                    value={
                      healthLabels[summary.health.status as keyof typeof healthLabels] ??
                      summary.health.status
                    }
                  />
                  <Detail label="Nhiệt độ gần nhất" value={summary.health.temperature} />
                  <Detail
                    label="Khám gần nhất"
                    value={journalStamp(summary.health.latestCheckupDate)}
                  />
                  {summary.health.isLocked && (
                    <Text style={ui.error}>
                      {summary.health.lockReason || 'Đang khóa huấn luyện'}
                    </Text>
                  )}
                  <Text style={ui.muted}>
                    Sức khỏe và lần khám gần nhất phản ánh thông tin hiện tại; các hoạt động phía
                    dưới được lọc theo ngày đã chọn.
                  </Text>
                </Card>
              </>
            )}
          </View>
        }
      />
    </Screen>
  );
}
export default function CareJournalScreen() {
  return (
    <RoleGuard roles={horseRoles}>
      <Journal />
    </RoleGuard>
  );
}
