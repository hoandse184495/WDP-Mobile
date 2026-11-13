import type { Role } from '@/core/constants/roles';
export function isClinicalHold(horse: {
  isTrainingLocked?: unknown;
  trainingLockReason?: unknown;
}) {
  return (
    horse.isTrainingLocked === true &&
    typeof horse.trainingLockReason === 'string' &&
    horse.trainingLockReason.includes('khám xác nhận')
  );
}
export const canControlTraining = (role?: Role) =>
  role === 'club_manager' || role === 'veterinarian';
export const lockActionLabels: Record<string, string> = {
  HORSE_EMERGENCY_LOCK: 'Tạm khóa huấn luyện',
  HORSE_EMERGENCY_UNLOCK: 'Mở khóa huấn luyện',
  HORSE_INTAKE_CLEARED: 'Hoàn tất khám đầu vào',
};
