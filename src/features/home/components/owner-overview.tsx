import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Choice, Detail, Empty } from '@/shared/components/ui';
import { ui } from '@/core/theme/theme';
import { formatDate } from '@/core/utils/date';
import { asRecord, entityId } from '@/features/operations/types/operation';
import { recordId } from '@/features/workspace/types/catalog';
import { HorseThumbnail } from '@/features/horses/components/horse-thumbnail';
import { healthLabels } from '@/features/horses/types/horse';
import { TrainingPlanCard } from '@/features/training/components/training-plan-card';
import type { Overview } from '../api/role-overview';
export function OwnerOverview({ data }: { data: NonNullable<Overview['owner']> }) {
  const [selectedId, setSelectedId] = useState('');
  const horse = data.horses.find((row) => row._id === selectedId) ?? data.horses[0];
  if (!horse) return <Empty label="Chưa có ngựa nào được gán cho bạn" />;
  const plans = data.plans.filter((row) => entityId(row.horseId) === horse._id);
  const sessions = data.sessions
    .filter((row) => entityId(row.horseId) === horse._id)
    .sort((a, b) => String(b.sessionDate ?? '').localeCompare(String(a.sessionDate ?? '')))
    .slice(0, 4);
  const records = data.records
    .filter((row) => entityId(row.horseId) === horse._id)
    .sort((a, b) => String(b.examinationDate ?? '').localeCompare(String(a.examinationDate ?? '')))
    .slice(0, 3);
  const open = (module: string, id: string) =>
    router.push({ pathname: '/records/[module]/[id]', params: { module, id } });
  return (
    <View style={{ gap: 16 }}>
      <Card>
        <Text style={ui.heading}>Theo dõi chiến mã của bạn</Text>
        <Choice
          label="Chọn chiến mã"
          value={horse._id}
          onChange={setSelectedId}
          options={data.horses.map((row) => ({
            value: row._id,
            label: `${row.name} · ${row.registrationCode}`,
          }))}
        />
        <View style={ui.row}>
          <HorseThumbnail horse={horse} />
          <View style={[ui.grow, { gap: 4 }]}>
            <Text style={ui.heading}>{horse.name}</Text>
            <Text style={ui.muted}>
              {horse.registrationCode} · {healthLabels[horse.healthStatus]}
            </Text>
          </View>
        </View>
        <Detail label="Thể lực / 100" value={horse.fitnessScore} />
        <Detail label="Cân nặng (kg)" value={horse.currentWeight} />
        <Detail label="Huấn luyện viên" value={String(asRecord(horse.trainerId).fullName ?? '—')} />
        <Detail label="Groom phụ trách" value={String(asRecord(horse.groom).fullName ?? '—')} />
        {horse.isTrainingLocked && (
          <Text style={ui.error}>{horse.trainingLockReason || 'Đang khóa huấn luyện'}</Text>
        )}
        <Button
          secondary
          title="Hồ sơ chiến mã"
          onPress={() => router.push({ pathname: '/horses/[id]', params: { id: horse._id } })}
        />
        <Button
          secondary
          title="Nhật ký chăm sóc theo ngày"
          onPress={() => router.push({ pathname: '/care-journal', params: { id: horse._id } })}
        />
      </Card>
      <Text style={ui.sectionTitle}>Giáo án đang áp dụng</Text>
      {plans.length ? (
        plans.map((plan) => (
          <TrainingPlanCard
            key={recordId(plan)}
            plan={plan}
            onPress={() => open('training', recordId(plan))}
          />
        ))
      ) : (
        <Card>
          <Text style={ui.muted}>Chưa có giáo án đang áp dụng cho chiến mã này.</Text>
        </Card>
      )}
      <Card>
        <Text style={ui.heading}>Buổi tập & nhận xét HLV gần nhất</Text>
        {!sessions.length && <Text style={ui.muted}>Chưa có buổi tập cho chiến mã này.</Text>}
        {sessions.map((row) => (
          <View key={recordId(row)} style={[ui.inset, { gap: 6 }]}>
            <Text style={ui.label}>{formatDate(String(row.sessionDate))}</Text>
            <Detail
              label="Cự ly (m)"
              value={typeof row.distanceCompleted === 'number' ? row.distanceCompleted : undefined}
            />
            <Detail
              label="Đánh giá"
              value={row.performanceRating ? `${row.performanceRating}/5` : 'Chưa chấm'}
            />
            <Text style={ui.body}>{String(row.trainerNotes || 'Chờ nhận xét chuyên môn')}</Text>
            <Button
              secondary
              title="Chi tiết buổi tập"
              onPress={() => open('sessions', recordId(row))}
            />
          </View>
        ))}
        <Button
          secondary
          title="Tất cả buổi tập của ngựa"
          onPress={() =>
            router.push({
              pathname: '/workspace/[module]',
              params: { module: 'sessions', horseId: horse._id },
            })
          }
        />
      </Card>
      <Card>
        <Text style={ui.heading}>Bệnh án & chăm sóc thú y</Text>
        {!records.length && <Text style={ui.muted}>Chưa có bệnh án cho chiến mã này.</Text>}
        {records.map((row) => (
          <View key={recordId(row)} style={ui.inset}>
            <Text style={ui.label}>{formatDate(String(row.examinationDate))}</Text>
            <Text style={ui.body}>{String(row.diagnosis || 'Khám sức khỏe')}</Text>
            <Button
              secondary
              title="Chi tiết lần khám"
              onPress={() => open('medical', recordId(row))}
            />
          </View>
        ))}
        <Button
          secondary
          title="Hồ sơ sức khỏe và thuốc"
          onPress={() => router.push({ pathname: '/health-dossier', params: { id: horse._id } })}
        />
      </Card>
      <Button
        secondary
        title="Khẩu phần của chiến mã"
        onPress={() =>
          router.push({
            pathname: '/workspace/[module]',
            params: { module: 'rations', horseId: horse._id },
          })
        }
      />
    </View>
  );
}
