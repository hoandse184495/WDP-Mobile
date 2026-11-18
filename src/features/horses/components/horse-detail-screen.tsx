import { HorseDocuments } from './horse-documents';
import { choiceLabel } from '@/features/operations/contracts/labels';
import { ClinicalHoldNotice, HorseTrainingActions } from './training-hold';
import { isClinicalHold } from '../utils/clinical-hold';
import { HorseLockHistory } from './horse-lock-history';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { canManageHorse, horseRoles } from '@/core/constants/roles';
import { ui } from '@/core/theme/theme';
import { formatDate } from '@/core/utils/date';
import {
  Badge,
  Button,
  Card,
  Detail,
  Failure,
  Loading,
  Screen,
  ScreenHeader,
} from '@/shared/components/ui';
import { referenceName } from '@/shared/types/api';
import { useSession } from '@/features/auth/stores/session-store';
import { useHorse } from '../hooks/use-horses';
import { healthLabels } from '../types/horse';
import { OperationPanel } from '@/features/operations/components/operation-panel';
import { HorseIdentity } from './horse-identity';
import { HorseAvatar, HorsePedigree } from './horse-media';
import { RoleGuard } from '@/shared/components/role-guard';
function HorseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useHorse(id);
  const user = useSession((state) => state.user);
  if (query.isPending)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!query.data)
    return (
      <Screen>
        <Failure error={query.error} retry={() => void query.refetch()} />
      </Screen>
    );
  const horse = query.data;
  return (
    <Screen>
      <ScreenHeader
        title={horse.name}
        eyebrow="HỒ SƠ CHIẾN MÃ"
        subtitle={horse.registrationCode}
        action={<Badge label={healthLabels[horse.healthStatus]} danger={horse.isTrainingLocked} />}
      />
      <Button
        secondary
        title="Nhật ký chăm sóc theo ngày"
        onPress={() => router.push({ pathname: '/care-journal', params: { id } })}
      />
      {user && ['club_manager', 'veterinarian', 'horse_owner'].includes(user.role) && (
        <Button
          secondary
          title="Hồ sơ sức khỏe và thuốc"
          onPress={() => router.push({ pathname: '/health-dossier', params: { id } })}
        />
      )}
      <HorseAvatar id={id} />
      <HorseTrainingActions horse={horse} />
      <OperationPanel
        module="horses"
        record={horse}
        exclude={['horses.emergency-lock', 'horses.emergency-unlock']}
      />
      <ClinicalHoldNotice horse={horse} />
      {horse.isTrainingLocked && !isClinicalHold(horse) && (
        <Card>
          <Text style={ui.error}>Đang khóa huấn luyện</Text>
          <Text style={ui.body}>
            {horse.trainingLockReason || 'Liên hệ bác sĩ thú y để kiểm tra điều kiện tập.'}
          </Text>
        </Card>
      )}
      <Card>
        <Text style={ui.heading}>Hồ sơ</Text>
        <Detail label="Giống" value={horse.breed} />
        <Detail label="Giới tính" value={choiceLabel(horse.gender)} />
        <Detail label="Ngày sinh" value={formatDate(horse.dateOfBirth)} />
        <Detail label="Màu lông" value={horse.color} />
        <Detail label="Chủ sở hữu" value={referenceName(horse.ownerId)} />
        <Detail label="Huấn luyện viên" value={referenceName(horse.trainerId)} />
        <Detail label="Nhân viên chăm sóc" value={referenceName(horse.groom)} />
      </Card>
      <HorseLockHistory id={id} />
      <HorseIdentity horse={horse} />
      <HorsePedigree id={id} />
      <HorseDocuments id={id} />
      <Card>
        <Text style={ui.heading}>Thể trạng</Text>
        <Detail label="Thể lực / 100" value={horse.fitnessScore} />
        <Detail label="Cân nặng (kg)" value={horse.currentWeight} />
        <Detail label="Chiều cao (hands)" value={horse.height} />
        <Detail label="Ghi chú" value={horse.notes} />
      </Card>
      {user && canManageHorse(user.role) && (
        <Button
          title="Cập nhật hồ sơ"
          icon="file"
          onPress={() => router.push({ pathname: '/horse-editor', params: { id } })}
        />
      )}
      <Button
        secondary
        title="Giáo án và kết quả"
        onPress={() =>
          router.push({
            pathname: '/workspace/[module]',
            params: {
              module: user?.role === 'veterinarian' ? 'sessions' : 'training',
              horseId: id,
            },
          })
        }
      />
    </Screen>
  );
}
export default function HorseDetailScreen() {
  return (
    <RoleGuard roles={horseRoles}>
      <HorseDetail />
    </RoleGuard>
  );
}
