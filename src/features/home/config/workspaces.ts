import type { Role } from '@/core/constants/roles';
import { modules } from '@/features/workspace/types/catalog';

export const workspaces: Record<
  Role,
  { title: string; description: string; primary: string; shortcuts: string[] }
> = {
  club_manager: {
    title: 'Tổng quan vận hành',
    description: 'Sức khỏe đàn ngựa, huấn luyện và các việc cần xử lý.',
    primary: 'tasks',
    shortcuts: ['horses', 'stables', 'training', 'staffWork'],
  },
  head_trainer: {
    title: 'Bảng điều hành HLV',
    description: 'Đánh giá buổi tập, theo dõi thể lực và điều chỉnh giáo án.',
    primary: 'training',
    shortcuts: ['sessions', 'tasks', 'medical', 'rations'],
  },
  veterinarian: {
    title: 'Tổng quan y tế',
    description: 'Ưu tiên điều trị, theo dõi chấn thương và lịch chăm sóc.',
    primary: 'medical',
    shortcuts: ['injuries', 'schedules', 'prescriptions', 'incidents'],
  },
  groom: {
    title: 'Bảng công việc',
    description: 'Công việc hôm nay, hướng dẫn tập và chăm sóc ngựa được giao.',
    primary: 'tasks',
    shortcuts: ['training', 'stables', 'incidents', 'replenishments'],
  },
  horse_owner: {
    title: 'Đàn ngựa của tôi',
    description: 'Theo dõi sức khỏe, tiến độ huấn luyện và nhận xét chuyên môn.',
    primary: 'horses',
    shortcuts: ['training', 'sessions', 'medical', 'rations'],
  },
  warehouse_keeper: {
    title: 'Điều hành kho',
    description: 'Dự báo thức ăn, chuyển kho hai chiều và điều phối kiểm kê.',
    primary: 'prescriptions',
    shortcuts: ['warehouses', 'replenishments', 'stocktakes', 'ledger'],
  },
};

export const destinationGroups = [
  {
    title: 'Ngựa & chuồng trại',
    keys: [
      'horses',
      'admissions',
      'stables',
      'stalls',
      'occupancies',
      'assignments',
      'trainerAssignments',
      'grooms',
    ],
  },
  { title: 'Huấn luyện & chăm sóc', keys: ['training', 'sessions', 'tasks', 'alerts', 'rations'] },
  {
    title: 'Y tế & sự cố',
    keys: ['medical', 'injuries', 'schedules', 'prescriptions', 'medicineCabinet', 'incidents'],
  },
  {
    title: 'Kho & vật tư',
    keys: [
      'warehouses',
      'items',
      'receipts',
      'transfers',
      'ledger',
      'feedIssues',
      'replenishments',
      'stocktakes',
      'disposals',
    ],
  },
  { title: 'Quản trị hệ thống', keys: ['team', 'staffWork', 'audit'] },
];

export const ownerTitles: Record<string, string> = {
  training: 'Tiến độ huấn luyện',
  sessions: 'Kết quả buổi tập',
  medical: 'Lịch sử thăm khám',
  rations: 'Khẩu phần ăn',
};

export function destination(key: string, role: Role) {
  if (['admissions', 'feedIssues', 'areaAssignments'].includes(key)) return undefined;
  if (key === 'medicineCabinet')
    return ['club_manager', 'veterinarian', 'warehouse_keeper'].includes(role)
      ? { title: 'Tủ thuốc thú y', path: '/medicine-cabinet' }
      : undefined;
  if (key === 'training' && role === 'veterinarian')
    return { title: 'Chỉ số buổi tập', path: '/workspace/sessions' };
  if (key === 'horses')
    return role === 'warehouse_keeper'
      ? undefined
      : {
          title: role === 'horse_owner' ? 'Hồ sơ ngựa của tôi' : 'Đàn ngựa',
          path: '/(tabs)/horses',
        };
  if (key === 'tasks')
    return ['club_manager', 'head_trainer', 'groom'].includes(role)
      ? { title: 'Công việc hôm nay', path: '/(tabs)/tasks' }
      : undefined;
  if (key === 'ledger')
    return ['club_manager', 'warehouse_keeper'].includes(role)
      ? { title: 'Sổ kho', path: '/stock-ledger' }
      : undefined;
  const config = modules[key];
  return config?.roles.includes(role)
    ? {
        title: role === 'horse_owner' ? (ownerTitles[key] ?? config.title) : config.title,
        path: `/workspace/${key}`,
      }
    : undefined;
}

export function navigationGroups(role: Role, search = '') {
  const term = search.trim().toLocaleLowerCase('vi');
  return destinationGroups
    .map((group) => ({
      title: group.title,
      items: group.keys
        .filter((key) => !(key === 'sessions' && role === 'veterinarian'))
        .flatMap((key) => {
          const item = destination(key, role);
          return item && (!term || item.title.toLocaleLowerCase('vi').includes(term))
            ? [{ ...item, key }]
            : [];
        }),
    }))
    .filter((group) => group.items.length > 0);
}
