export const roleLabels = {
  warehouse_keeper: 'Thủ kho',
  club_manager: 'Quản lý câu lạc bộ',
  head_trainer: 'Huấn luyện viên',
  veterinarian: 'Bác sĩ thú y',
  groom: 'Nhân viên chăm sóc',
  horse_owner: 'Chủ ngựa',
} as const;
export type Role = keyof typeof roleLabels;
export const allRoles = Object.keys(roleLabels) as Role[];
export const horseRoles = allRoles.filter((role) => role !== 'warehouse_keeper');
export const taskRoles: Role[] = ['club_manager', 'head_trainer', 'groom'];
export const medicalRoles: Role[] = ['club_manager', 'head_trainer', 'veterinarian', 'horse_owner'];
export function canManageHorse(role: Role) {
  return role === 'club_manager' || role === 'head_trainer';
}

export const trainingPlanRoles: Role[] = ['club_manager', 'head_trainer'];
export const canManageTrainingPlan = (role: Role) => trainingPlanRoles.includes(role);
