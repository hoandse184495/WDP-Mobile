import { z } from 'zod';
import { horseRoles as allRoles, medicalRoles, Role } from '@/core/constants/roles';
import { extendedModules } from './extended-catalog';
export interface WorkspaceModule {
  title: string;
  description: string;
  path: string;
  key: string;
  roles: Role[];
  fields: readonly { key: string; label: string; date?: boolean }[];
  detailKey?: string;
  unpaged?: boolean;
  horseFilter?: boolean;
}
const staff: Role[] = ['club_manager', 'head_trainer', 'groom', 'veterinarian'];
const stock: Role[] = ['club_manager', 'warehouse_keeper', 'groom'];
const fields = (values: [string, string, boolean?][]) =>
  values.map(([key, label, date]) => ({ key, label, date }));
const baseModules = {
  training: {
    title: 'Giáo án',
    description: 'Kế hoạch và bài tập trong phạm vi của bạn.',
    path: '/training-plans',
    key: 'plans',
    roles: ['club_manager', 'head_trainer', 'groom', 'horse_owner'],
    detailKey: 'plan',
    horseFilter: true,
    fields: fields([
      ['horseId', 'Ngựa'],
      ['phase', 'Giai đoạn'],
      ['startDate', 'Bắt đầu', true],
      ['endDate', 'Kết thúc', true],
      ['isActive', 'Đang áp dụng'],
      ['description', 'Mô tả'],
      ['instructions', 'Hướng dẫn'],
    ]),
  },
  sessions: {
    title: 'Kết quả huấn luyện',
    description: 'Số đo thực tế và đánh giá buổi tập.',
    path: '/training-sessions',
    key: 'sessions',
    roles: allRoles,
    horseFilter: true,
    fields: fields([
      ['horseId', 'Ngựa'],
      ['sessionDate', 'Ngày tập', true],
      ['status', 'Trạng thái'],
      ['distanceCompleted', 'Quãng đường (m)'],
      ['durationMinutes', 'Thời lượng (phút)'],
      ['avgSpeed', 'Tốc độ trung bình (m/s)'],
      ['maxSpeed', 'Tốc độ tối đa (m/s)'],
      ['avgHeartRate', 'Nhịp tim TB (bpm)'],
      ['maxHeartRate', 'Nhịp tim tối đa (bpm)'],
      ['performanceRating', 'Đánh giá / 5'],
      ['trainerNotes', 'Nhận xét HLV'],
      ['groomNotes', 'Ghi chú Groom'],
      ['alertMessage', 'Cảnh báo'],
    ]),
  },
  medical: {
    title: 'Bệnh án',
    description: 'Thông tin y tế được backend cung cấp theo vai trò.',
    path: '/medical-records',
    key: 'records',
    roles: medicalRoles,
    detailKey: 'record',
    horseFilter: true,
    fields: fields([
      ['horseId', 'Ngựa'],
      ['type', 'Loại khám'],
      ['examinationDate', 'Ngày khám', true],
      ['veterinarianId', 'Bác sĩ'],
      ['diagnosis', 'Chẩn đoán'],
      ['treatment', 'Điều trị'],
      ['weight', 'Cân nặng (kg)'],
      ['height', 'Chiều cao (hands)'],
      ['temperature', 'Nhiệt độ (°C)'],
      ['heartRate', 'Nhịp tim (bpm)'],
      ['nextCheckupDate', 'Tái khám', true],
      ['notes', 'Ghi chú'],
    ]),
  },
  injuries: {
    title: 'Chấn thương',
    description: 'Tình trạng chấn thương và điều kiện trở lại tập.',
    path: '/injuries',
    key: 'injuries',
    roles: medicalRoles,
    detailKey: 'injury',
    horseFilter: true,
    fields: fields([
      ['horseId', 'Ngựa'],
      ['injuryDate', 'Ghi nhận', true],
      ['affectedArea', 'Vùng ảnh hưởng'],
      ['severity', 'Mức độ'],
      ['status', 'Trạng thái'],
      ['description', 'Mô tả'],
      ['treatment', 'Điều trị'],
      ['resolvedAt', 'Hồi phục', true],
    ]),
  },
  schedules: {
    title: 'Lịch y tế',
    description: 'Tái khám, tiêm phòng, tẩy giun và chăm móng.',
    path: '/medical-schedules',
    key: 'schedules',
    roles: ['club_manager', 'veterinarian'],
    horseFilter: true,
    fields: fields([
      ['horseId', 'Ngựa'],
      ['type', 'Loại'],
      ['dueDate', 'Ngày đến hạn', true],
      ['status', 'Trạng thái'],
      ['repeatDays', 'Lặp lại (ngày)'],
      ['notes', 'Ghi chú'],
      ['result', 'Kết quả'],
    ]),
  },
  admissions: {
    title: 'Tiếp nhận ngựa',
    description: 'Theo dõi hồ sơ tiếp nhận và các bước đánh giá.',
    path: '/admissions',
    key: 'applications',
    roles: allRoles.filter((role) => role !== 'horse_owner'),
    detailKey: 'application',
    fields: fields([
      ['horse', 'Ngựa đăng ký'],
      ['ownerId', 'Chủ ngựa'],
      ['status', 'Trạng thái'],
      ['createdAt', 'Ngày tạo', true],
      ['assignedGroomId', 'Groom'],
      ['assignedTrainerId', 'HLV'],
    ]),
  },
  stables: {
    title: 'Chuồng trại',
    description: 'Các khu chuồng được phép truy cập.',
    path: '/stables',
    key: 'stables',
    roles: staff,
    unpaged: true,
    fields: fields([
      ['code', 'Mã khu'],
      ['description', 'Mô tả'],
      ['isActive', 'Đang hoạt động'],
    ]),
  },
  stalls: {
    title: 'Ô chuồng',
    description: 'Tình trạng ô chuồng và phạm vi phân công.',
    path: '/stables',
    key: 'stalls',
    roles: staff,
    unpaged: true,
    fields: fields([
      ['stableId', 'Khu chuồng'],
      ['code', 'Mã ô'],
      ['type', 'Loại ô'],
      ['occupied', 'Đang có ngựa'],
      ['maintenance', 'Bảo trì'],
      ['isActive', 'Hoạt động'],
    ]),
  },
  rations: {
    title: 'Khẩu phần',
    description: 'Khẩu phần theo ngựa, phiên bản và thời gian hiệu lực.',
    path: '/rations',
    key: 'plans',
    roles: allRoles,
    detailKey: 'plan',
    horseFilter: true,
    fields: fields([
      ['horseId', 'Ngựa'],
      ['status', 'Trạng thái'],
      ['version', 'Phiên bản'],
      ['validFrom', 'Hiệu lực từ', true],
      ['validTo', 'Đến ngày', true],
      ['objective', 'Mục tiêu'],
      ['instructions', 'Hướng dẫn'],
    ]),
  },
  incidents: {
    title: 'Báo cáo sự cố',
    description: 'Báo cáo và theo dõi sự cố tại câu lạc bộ.',
    path: '/incidents',
    key: 'reports',
    roles: ['club_manager', 'groom', 'veterinarian', 'head_trainer'],
    detailKey: 'report',
    fields: fields([
      ['targetName', 'Đối tượng'],
      ['targetCode', 'Mã'],
      ['priority', 'Ưu tiên'],
      ['category', 'Phân loại'],
      ['status', 'Trạng thái'],
      ['observedAt', 'Phát hiện', true],
      ['description', 'Mô tả'],
      ['reportedBy', 'Người báo'],
    ]),
  },
  warehouses: {
    title: 'Kho vật tư',
    description: 'Kho chung, kho phụ và tủ thuốc được phân công trực tiếp.',
    path: '/inventory/warehouses',
    key: 'warehouses',
    roles: [...stock, 'veterinarian'],
    fields: fields([
      ['code', 'Mã kho'],
      ['type', 'Loại kho'],
      ['assignedGroomIds', 'Groom phụ trách / kiểm kê'],
      ['responsibleVetName', 'Vet phụ trách'],
      ['stocktakeNumber', 'Phiên kiểm kê đang khóa kho'],
      ['isActive', 'Đang hoạt động'],
      ['notes', 'Ghi chú'],
    ]),
  },
  items: {
    title: 'Danh mục vật tư',
    description: 'Thức ăn, vật tư chăm sóc và vệ sinh.',
    path: '/inventory/items',
    key: 'items',
    roles: ['club_manager'],
    fields: fields([
      ['code', 'Mã vật tư'],
      ['category', 'Phân loại'],
      ['unit', 'Đơn vị'],
      ['isActive', 'Hoạt động'],
      ['notes', 'Ghi chú'],
    ]),
  },
  receipts: {
    title: 'Nhập kho',
    description: 'Phiếu nhận vật tư và lô hàng.',
    path: '/inventory/receipts',
    key: 'receipts',
    roles: ['club_manager'],
    detailKey: 'receipt',
    fields: fields([
      ['warehouse', 'Kho'],
      ['supplier', 'Nhà cung cấp'],
      ['status', 'Trạng thái'],
      ['receivedAt', 'Ngày nhận', true],
      ['notes', 'Ghi chú'],
    ]),
  },
  transfers: {
    title: 'Chuyển kho',
    description: 'Theo dõi vật tư được luân chuyển giữa các kho.',
    path: '/inventory/transfers',
    key: 'transfers',
    roles: ['club_manager'],
    fields: fields([
      ['sourceWarehouse', 'Kho nguồn'],
      ['destinationWarehouse', 'Kho đích'],
      ['status', 'Trạng thái'],
      ['createdAt', 'Ngày tạo', true],
      ['notes', 'Ghi chú'],
    ]),
  },
  feedIssues: {
    title: 'Xuất thức ăn',
    description: 'Phiếu xuất thức ăn cho từng bữa đã giao.',
    path: '/inventory/feed-issues',
    key: 'issues',
    roles: stock,
    horseFilter: true,
    fields: fields([
      ['horseId', 'Ngựa'],
      ['warehouseId', 'Kho'],
      ['mealName', 'Bữa ăn'],
      ['feedingDay', 'Ngày cho ăn', true],
      ['confirmedBy', 'Người xuất'],
      ['confirmedAt', 'Xác nhận', true],
    ]),
  },
  replenishments: {
    title: 'Đề xuất bổ sung',
    description: 'Nhu cầu thức ăn và tình trạng cấp bổ sung.',
    path: '/inventory/replenishments',
    key: 'requests',
    roles: [...stock, 'veterinarian'],
    fields: fields([
      ['itemName', 'Vật tư'],
      ['status', 'Trạng thái'],
      ['requested', 'Đề xuất'],
      ['approved', 'Được duyệt'],
      ['supplied', 'Đã cấp'],
      ['remaining', 'Còn thiếu'],
      ['unit', 'Đơn vị'],
      ['decisionNote', 'Quyết định'],
    ]),
  },
  stocktakes: {
    title: 'Kiểm kê',
    description: 'Phiếu kiểm đếm và đối soát tồn kho.',
    path: '/inventory/stocktakes',
    key: 'stocktakes',
    roles: stock,
    fields: fields([
      ['warehouse', 'Kho'],
      ['counter', 'Người kiểm'],
      ['status', 'Trạng thái'],
      ['totalLines', 'Tổng dòng'],
      ['countedLines', 'Đã đếm'],
      ['notes', 'Ghi chú'],
    ]),
  },
  disposals: {
    title: 'Xử lý vật tư',
    description: 'Vật tư hỏng, hết hạn và quyết định xử lý.',
    path: '/stock-disposals',
    key: 'disposals',
    roles: [...stock, 'veterinarian'],
    detailKey: 'disposal',
    fields: fields([
      ['warehouse', 'Kho'],
      ['status', 'Trạng thái'],
      ['reasonType', 'Loại lý do'],
      ['reason', 'Lý do'],
      ['decisionReason', 'Quyết định'],
      ['handling', 'Cách xử lý'],
    ]),
  },
  team: {
    title: 'Nhân sự',
    description: 'Tài khoản và vai trò trong câu lạc bộ.',
    path: '/users',
    key: 'users',
    roles: ['club_manager'],
    detailKey: 'user',
    fields: fields([
      ['email', 'Email'],
      ['role', 'Vai trò'],
      ['phone', 'Điện thoại'],
      ['isActive', 'Hoạt động'],
      ['lastLogin', 'Đăng nhập gần nhất', true],
    ]),
  },
  audit: {
    title: 'Nhật ký hệ thống',
    description: 'Các thay đổi và người thực hiện.',
    path: '/audit-logs',
    key: 'logs',
    roles: ['club_manager'],
    fields: fields([
      ['action', 'Hành động'],
      ['actorId', 'Người thực hiện'],
      ['targetType', 'Loại đối tượng'],
      ['description', 'Mô tả'],
      ['createdAt', 'Thời điểm', true],
    ]),
  },
} satisfies Record<string, WorkspaceModule>;
export const modules: Record<string, WorkspaceModule> = {
  ...baseModules,
  ...extendedModules,
  sessions: { ...baseModules.sessions, detailKey: '$self' },
  items: { ...baseModules.items, roles: ['club_manager', 'warehouse_keeper'] },
  receipts: { ...baseModules.receipts, roles: ['club_manager', 'warehouse_keeper'] },
  transfers: {
    ...baseModules.transfers,
    roles: ['club_manager', 'warehouse_keeper'],
    detailKey: 'transfer',
  },
  replenishments: { ...baseModules.replenishments, detailKey: 'request' },
  stocktakes: { ...baseModules.stocktakes, detailKey: 'stocktake' },
  schedules: { ...baseModules.schedules, detailKey: '$self' },
  stables: { ...baseModules.stables, detailKey: '$self' },
  stalls: { ...baseModules.stalls, detailKey: '$self' },
  injuries: {
    ...baseModules.injuries,
    roles: ['club_manager', 'head_trainer', 'veterinarian', 'groom'],
  },
  feedIssues: { ...baseModules.feedIssues, roles: ['club_manager', 'groom'] },
};
export type ModuleKey = keyof typeof modules;
export function getModule(key: string): WorkspaceModule | undefined {
  if (key === 'areaAssignments') return undefined;
  return Object.hasOwn(modules, key) ? modules[key as ModuleKey] : undefined;
}
export const recordSchema = z
  .object({ _id: z.string().optional(), id: z.string().optional() })
  .passthrough()
  .refine((record) => Boolean(record._id || record.id), 'Hồ sơ thiếu mã định danh.');
export type WorkspaceRecord = z.infer<typeof recordSchema>;
export const recordId = (record: WorkspaceRecord) => record._id ?? record.id ?? '';
export function recordTitle(record: WorkspaceRecord) {
  for (const field of ['title', 'name', 'fullName', 'number', 'code', 'itemName', 'action'])
    if (typeof record[field] === 'string') return record[field] as string;
  if (
    record.horse &&
    typeof record.horse === 'object' &&
    'name' in record.horse &&
    typeof record.horse.name === 'string'
  )
    return record.horse.name;
  if (
    record.horseId &&
    typeof record.horseId === 'object' &&
    'name' in record.horseId &&
    typeof record.horseId.name === 'string'
  )
    return record.horseId.name;
  return 'Chi tiết hồ sơ';
}
