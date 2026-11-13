import { Text } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/stores/session-store';
import { Button, Card, Detail, Choice, Failure } from '@/shared/components/ui';
import { ui } from '@/core/theme/theme';
import { asRecord, entityId, type JsonRecord } from '@/features/operations/types/operation';
import { objectId } from '@/shared/types/api';
import { horseApi } from '../api/horse-api';
import { canControlTraining, isClinicalHold } from '../utils/clinical-hold';
import { journalStamp } from '../utils/care-journal';
export function ClinicalHoldNotice({
  horse,
  inForm = false,
}: {
  horse: JsonRecord;
  inForm?: boolean;
}) {
  const role = useSession((s) => s.user?.role);
  if (!isClinicalHold(horse)) return null;
  return (
    <Card>
      <Text style={ui.heading}>Tạm khóa huấn luyện · Chờ khám xác nhận</Text>
      <Text style={ui.error}>{String(horse.trainingLockReason)}</Text>
      {typeof horse.trainingLockedAt === 'string' && (
        <Detail label="Thời điểm khóa" value={journalStamp(horse.trainingLockedAt)} />
      )}
      <Text style={ui.body}>
        Bác sĩ cần khám lâm sàng và ghi nhận kết quả. Sau khi lưu, hệ thống kiểm tra điều kiện mở
        khóa; ngựa còn chấn thương chưa hồi phục vẫn bị khóa huấn luyện.
      </Text>
      {role === 'veterinarian' && !inForm && (
        <Button
          title="Khám xác nhận cho ngựa này"
          onPress={() =>
            router.push({
              pathname: '/operations/[operation]',
              params: { operation: 'medical.encounter', horseId: entityId(horse) },
            })
          }
        />
      )}
    </Card>
  );
}
export function HorseTrainingActions({ horse }: { horse: JsonRecord }) {
  const user = useSession((s) => s.user);
  if (!canControlTraining(user?.role) || !entityId(horse)) return null;
  const locked = horse.isTrainingLocked === true,
    operation = locked ? 'horses.emergency-unlock' : 'horses.emergency-lock';
  return (
    <Button
      title={locked ? 'Mở khóa huấn luyện' : 'Khóa huấn luyện khẩn cấp'}
      secondary={locked}
      danger={!locked}
      onPress={() => {
        router.push({
          pathname: '/operations/[operation]',
          params: { operation, id: entityId(horse) },
        });
      }}
    />
  );
}
export function ClinicalFormHint({ horseId }: { horseId: string }) {
  const valid = objectId.safeParse(horseId).success;
  const query = useQuery({
    queryKey: ['horse', horseId],
    queryFn: ({ signal }) => horseApi.detail(horseId, signal),
    enabled: valid,
    retry: false,
  });
  if (!valid) return null;
  if (query.error) return <Failure error={query.error} retry={() => void query.refetch()} />;
  return query.data ? <ClinicalHoldNotice horse={query.data} inForm /> : null;
}
const presets = [
  ['limp', 'Quan sát khập khiễng, di chuyển không đều chân.'],
  ['fever', 'Thân nhiệt tăng cao, nhịp thở nhanh, biểu hiện mệt mỏi.'],
  ['swelling', 'Sưng nóng vùng gân hoặc khớp chân, phản ứng đau khi chạm.'],
  ['feeding', 'Ngựa bồn chồn, bỏ ăn, cần kiểm tra lâm sàng.'],
  ['impact', 'Va đập khi di chuyển hoặc tại chuồng, có vết bầm hoặc trầy xước.'],
] as const;
export function EmergencyOperationHelp({
  unlock,
  context,
  reason,
  onPreset,
}: {
  unlock: boolean;
  context: JsonRecord;
  reason: unknown;
  onPreset: (value: string) => void;
}) {
  return (
    <Card>
      <Text style={ui.heading}>
        {unlock ? 'Kết luận kiểm tra trước khi mở khóa' : 'Tạm dừng huấn luyện chờ kiểm tra'}
      </Text>
      {context.trainingLockReason != null && (
        <Text style={ui.body}>{String(context.trainingLockReason)}</Text>
      )}
      <Text style={ui.muted}>
        {unlock
          ? 'Ghi kết luận hoặc lý do mở khóa. Hệ thống sẽ từ chối nếu ngựa vẫn còn chấn thương chưa hồi phục.'
          : 'Ghi nhận biểu hiện thực tế hoặc chọn gợi ý rồi chỉnh lại nội dung bên dưới. Ngựa sẽ được tạm khóa huấn luyện để chờ bác sĩ xác nhận.'}
      </Text>
      {!unlock && (
        <Choice
          label="Gợi ý lý do khóa"
          value={presets.find(([, text]) => text === reason)?.[0]}
          options={presets.map(([value, label]) => ({ value, label }))}
          onChange={(value) => {
            const found = presets.find(([key]) => key === value);
            if (found) onPreset(found[1]);
          }}
        />
      )}
    </Card>
  );
}
export function encounterHorseId(payload: JsonRecord) {
  return entityId(asRecord(payload.record).horseId ?? payload.horseId);
}
