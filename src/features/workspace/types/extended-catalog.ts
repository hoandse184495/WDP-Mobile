import type { WorkspaceModule } from './catalog';
const manager = ['club_manager'] as const;
const supervisor = ['club_manager', 'warehouse_keeper'] as const;
const staff = ['club_manager', 'head_trainer', 'veterinarian', 'groom'] as const;
const fields = (values: [string, string, boolean?][]) =>
  values.map(([key, label, date]) => ({ key, label, date }));
const stableModule = (
  title: string,
  key: string,
  roles: WorkspaceModule['roles'],
): WorkspaceModule => ({
  title,
  description: `Theo dõi và điều phối ${title.toLowerCase()} trong phạm vi được giao.`,
  path: '/stables',
  key,
  roles,
  unpaged: true,
  detailKey: '$self',
  fields: fields([
    ['horseId', 'Ngựa'],
    ['stableId', 'Khu chuồng'],
    ['stallId', 'Ô chuồng'],
    ['groomId', 'Người chăm sóc'],
    ['trainerId', 'Huấn luyện viên'],
    ['isActive', 'Đang hiệu lực'],
    ['reason', 'Lý do'],
    ['startedAt', 'Bắt đầu', true],
    ['endedAt', 'Kết thúc', true],
  ]),
});
export const extendedModules: Record<string, WorkspaceModule> = {
  prescriptions: {
    title: 'Đơn thuốc và cấp phát',
    description: 'Đối chiếu chỉ định, người nhận, thuốc còn cần cấp và lịch sử bàn giao.',
    path: '/prescriptions',
    key: 'records',
    roles: ['club_manager', 'veterinarian', 'warehouse_keeper'],
    detailKey: 'record',
    fields: fields([
      ['horse', 'Ngựa'],
      ['veterinarian', 'Bác sĩ kê đơn'],
      ['examinationDate', 'Ngày khám', true],
      ['prescription.status', 'Trạng thái cấp phát'],
    ]),
  },
  occupancies: stableModule('Ngựa lưu trú', 'occupancies', [...manager]),
  assignments: stableModule('Phân công chăm sóc', 'assignments', [...manager]),
  trainerAssignments: stableModule('Phân công huấn luyện', 'trainerAssignments', [...manager]),
  areaAssignments: stableModule('Phụ trách khu chuồng', 'areaAssignments', [...manager]),
  grooms: {
    ...stableModule('Công suất nhân viên chăm sóc', 'grooms', [...manager]),
    fields: fields([
      ['fullName', 'Họ tên'],
      ['maxAssignedHorses', 'Công suất tối đa'],
    ]),
  },
  alerts: {
    title: 'Cảnh báo công việc',
    description: 'Xác minh trở ngại và xử lý cảnh báo trong ngày.',
    path: '/daily-tasks/alerts',
    key: 'alerts',
    roles: ['club_manager', 'groom'],
    fields: fields([
      ['title', 'Công việc'],
      ['code', 'Mã cảnh báo'],
      ['message', 'Nội dung'],
      ['status', 'Trạng thái'],
      ['note', 'Ghi chú'],
    ]),
  },
  staffWork: {
    title: 'Giám sát công việc nhân sự',
    description: 'Tổng hợp lịch làm việc và các hàng đợi chưa phân công.',
    path: '/users/work-monitor',
    key: 'rows',
    roles: [...manager],
    fields: fields([
      ['title', 'Công việc'],
      ['employee', 'Nhân viên'],
      ['role', 'Vai trò'],
      ['state', 'Trạng thái'],
      ['horse', 'Ngựa'],
      ['startsAt', 'Bắt đầu', true],
      ['endsAt', 'Kết thúc', true],
    ]),
  },
};
export const supervisorRoles = [...supervisor];
export const stableRoles = [...staff];
