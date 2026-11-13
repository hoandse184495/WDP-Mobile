import type { Role } from '@/core/constants/roles';
import { horseApi } from '@/features/horses/api/horse-api';
import { workspaceApi } from '@/features/workspace/api/workspace-api';
import { recordId, recordTitle, type WorkspaceRecord } from '@/features/workspace/types/catalog';
import { referenceName, type Reference } from '@/shared/types/api';
import { clubDate, formatDate } from '@/core/utils/date';
import { loadDashboard } from './dashboard-api';

export interface OverviewItem {
  id: string;
  title: string;
  detail: string;
  path: string;
  danger?: boolean;
}
export interface OverviewSection {
  title: string;
  path: string;
  items: OverviewItem[];
  empty: string;
}
export interface Overview {
  metrics: { label: string; value: number | string }[];
  sections: OverviewSection[];
  health?: Record<'ready' | 'monitoring' | 'injured' | 'isolated', number>;
  activity?: {
    date: string;
    sessions: number;
    alerts: number;
    averageSpeed: number | null;
    averageHeartRate: number | null;
  }[];
}

async function allRecords(
  module: string,
  signal?: AbortSignal,
  filters: Record<string, unknown> = {},
) {
  const rows: WorkspaceRecord[] = [];
  let page = 1;
  while (true) {
    const result = await workspaceApi.list(module, page, undefined, signal, filters);
    rows.push(...result.items);
    if (page >= result.pagination.totalPages) return rows;
    page += 1;
  }
}
async function allHorses(signal?: AbortSignal) {
  const rows = [];
  let page = 1;
  while (true) {
    const result = await horseApi.list({ page, limit: 50 }, signal);
    rows.push(...result.items);
    if (page >= result.pagination.totalPages) return rows;
    page += 1;
  }
}
const horseName = (row: WorkspaceRecord) => referenceName(row.horseId as Reference);
const section = (
  title: string,
  module: string,
  rows: WorkspaceRecord[],
  detail: (row: WorkspaceRecord) => string,
  empty: string,
): OverviewSection => ({
  title,
  path: `/workspace/${module}`,
  empty,
  items: rows.slice(0, 4).map((row) => ({
    id: recordId(row),
    title: horseName(row) !== '—' ? horseName(row) : recordTitle(row),
    detail: detail(row),
    path:
      module === 'sessions'
        ? `/session-review/${recordId(row)}`
        : `/records/${module}/${recordId(row)}`,
  })),
});

export async function loadRoleOverview(role: Role, signal?: AbortSignal): Promise<Overview> {
  if (['club_manager', 'head_trainer', 'warehouse_keeper'].includes(role)) {
    const data = await loadDashboard(role, signal);
    const sections: OverviewSection[] = [];
    let metrics = data.metrics;
    if (role === 'head_trainer') {
      const sessions = await allRecords('sessions', signal, { status: 'completed' });
      const pending = sessions.filter((row) => row.performanceRating == null);
      metrics = data.metrics.map((metric) =>
        metric.label === 'Chờ đánh giá'
          ? { label: 'Chờ đánh giá / toàn bộ', value: pending.length }
          : metric,
      );
      sections.push(
        section(
          'Cần đánh giá',
          'sessions',
          pending,
          (row) => formatDate(String(row.sessionDate)),
          'Đã đánh giá đầy đủ các buổi tập.',
        ),
      );
    }
    if ('progress' in data && data.progress)
      sections.push({
        title: 'Thể lực & giáo án',
        path: '/(tabs)/horses',
        empty: 'Chưa có ngựa trong phạm vi phụ trách.',
        items: data.progress.slice(0, 4).map((horse) => ({
          id: horse.id,
          title: horse.name,
          detail: `${horse.activePlan?.title ?? 'Chưa có giáo án'} · ${horse.fitnessScore ?? '—'}%`,
          path: `/horses/${horse.id}`,
          danger: horse.isTrainingLocked,
        })),
      });
    if (role !== 'warehouse_keeper')
      sections.push({
        title: 'Cảnh báo an toàn',
        path: '/workspace/sessions',
        empty: 'Không có cảnh báo huấn luyện trong kỳ.',
        items: data.alerts.map((alert) => ({
          id: alert.id,
          title: alert.horse?.name ?? 'Cảnh báo huấn luyện',
          detail: alert.alertMessage ?? alert.alertType ?? 'Vượt ngưỡng an toàn',
          path: '/workspace/sessions',
          danger: true,
        })),
      });
    return {
      metrics,
      sections,
      ...('health' in data ? { health: data.health, activity: data.activity } : {}),
    };
  }
  const horses = await allHorses(signal);
  const locked = horses.filter((horse) => horse.isTrainingLocked);
  const horseSection: OverviewSection = {
    title: role === 'horse_owner' ? 'Chiến mã của bạn' : 'Cần lưu ý tại chuồng',
    path: '/(tabs)/horses',
    empty:
      role === 'horse_owner'
        ? 'Chưa có ngựa được gán cho bạn.'
        : 'Không có ngựa bị khóa huấn luyện.',
    items: (role === 'horse_owner' ? horses : locked).slice(0, 4).map((horse) => ({
      id: horse._id,
      title: horse.name,
      detail: horse.trainingLockReason || `Thể lực ${horse.fitnessScore}%`,
      danger: horse.isTrainingLocked,
      path: `/horses/${horse._id}`,
    })),
  };
  if (role === 'veterinarian') {
    const emergency = locked.filter((horse) => horse.trainingLockReason?.includes('khám xác nhận'));
    const [injuries, records, schedules] = await Promise.all([
      allRecords('injuries', signal),
      allRecords('medical', signal),
      allRecords('schedules', signal),
    ]);
    const unresolved = injuries.filter((row) => row.status !== 'resolved');
    const severity = ['critical', 'severe', 'moderate', 'minor'];
    unresolved.sort(
      (a, b) => severity.indexOf(String(a.severity)) - severity.indexOf(String(b.severity)),
    );
    const activeSchedules = schedules
      .filter((row) =>
        ['scheduled', 'due', 'overdue', 'upcoming'].includes(
          String(row.status ?? row.displayStatus),
        ),
      )
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
    return {
      metrics: [
        { label: 'Chấn thương chưa khỏi', value: unresolved.length },
        {
          label: 'Đang hồi phục',
          value: unresolved.filter((row) => row.status === 'recovering').length,
        },
        { label: 'Ngựa khóa tập', value: locked.length },
        { label: 'Bệnh án đã ghi nhận', value: records.length },
        {
          label: 'Lịch cần thực hiện hôm nay',
          value: activeSchedules.filter((row) => row.dueDate === clubDate()).length,
        },
        ...(emergency.length ? [{ label: 'Cần khám xác nhận', value: emergency.length }] : []),
      ],
      sections: [
        ...(emergency.length
          ? [
              {
                title: 'Chờ khám xác nhận',
                path: '/workspace/medical',
                empty: 'Không có ngựa chờ khám xác nhận.',
                items: emergency.slice(0, 4).map((horse) => ({
                  id: horse._id,
                  title: horse.name,
                  detail: horse.trainingLockReason || 'Chờ khám xác nhận',
                  danger: true,
                  path: '/horses/' + horse._id,
                })),
              },
            ]
          : []),
        section(
          'Ưu tiên điều trị',
          'injuries',
          unresolved,
          (row) =>
            String(row.treatmentPlan || row.description || row.affectedArea || 'Đang điều trị'),
          'Không có ca cần điều trị.',
        ),
        section(
          'Lịch chăm sóc y tế',
          'schedules',
          activeSchedules,
          (row) => `${formatDate(String(row.dueDate))} · ${String(row.title || 'Chăm sóc y tế')}`,
          'Không có lịch chăm sóc y tế đang chờ.',
        ),
        horseSection,
      ],
    };
  }
  const [plans, sessions] = await Promise.all([
    allRecords('training', signal, { isActive: true }),
    allRecords('sessions', signal),
  ]);
  if (role === 'horse_owner') {
    const [records, rations] = await Promise.all([
      allRecords('medical', signal),
      allRecords('rations', signal),
    ]);
    const activeRations = rations.filter(
      (row) =>
        row.status === 'approved' &&
        String(row.validFrom) <= clubDate() &&
        String(row.validTo) >= clubDate(),
    );
    const scores = horses.map((horse) => horse.fitnessScore).filter(Number.isFinite);
    return {
      metrics: [
        { label: 'Ngựa thuộc sở hữu', value: horses.length },
        {
          label: 'Thể lực trung bình',
          value: scores.length
            ? `${(scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)}%`
            : '—',
        },
        { label: 'Giáo án đang áp dụng', value: plans.length },
        {
          label: 'Ngựa cần theo dõi',
          value: horses.filter((horse) => horse.healthStatus !== 'ready').length,
        },
      ],
      sections: [
        horseSection,
        {
          ...section(
            'Buổi tập & nhận xét',
            'sessions',
            sessions,
            (row) => String(row.trainerNotes || 'Chờ nhận xét chuyên môn'),
            'Chưa có buổi tập.',
          ),
          items: sessions.slice(0, 4).map((row) => ({
            id: recordId(row),
            title: horseName(row),
            detail: String(row.trainerNotes || 'Chờ nhận xét chuyên môn'),
            path: '/session-review/' + recordId(row),
          })),
        },
        section(
          'Lịch sử chăm sóc y tế',
          'medical',
          records,
          (row) => String(row.diagnosis || 'Khám sức khỏe'),
          'Chưa có bệnh án.',
        ),
        section(
          'Khẩu phần đang áp dụng',
          'rations',
          activeRations,
          (row) => String(row.title || 'Xem khẩu phần'),
          'Chưa có khẩu phần trong thời hạn.',
        ),
      ],
    };
  }
  const now = Date.now();
  const eligible = plans.filter((plan) => {
    const ref = plan.horseId as Reference;
    const horse = horses.find((item) => item._id === (typeof ref === 'string' ? ref : ref?._id));
    return (
      horse &&
      !horse.isTrainingLocked &&
      Date.parse(String(plan.startDate)) <= now &&
      now <= Date.parse(String(plan.endDate))
    );
  });
  return {
    metrics: [
      { label: 'Giáo án trong thời hạn', value: eligible.length },
      { label: 'Ngựa khóa tập', value: locked.length },
      {
        label: 'Buổi tập đã thực hiện',
        value: sessions.filter((row) => row.status === 'completed').length,
      },
      {
        label: 'Buổi có cảnh báo',
        value: sessions.filter((row) => row.status === 'completed' && row.alertTriggered).length,
      },
    ],
    sections: [
      section(
        'Hướng dẫn tập đang áp dụng',
        'training',
        eligible,
        (row) => String(row.instructions || row.title || 'Xem chỉ dẫn của HLV'),
        'Chưa có ngựa đủ điều kiện tập.',
      ),
      horseSection,
      {
        ...section(
          'Nhật ký của tôi',
          'sessions',
          sessions,
          (row) => String(row.trainerNotes || 'Chưa có nhận xét từ HLV'),
          'Chưa có kết quả buổi tập.',
        ),
        items: sessions.slice(0, 4).map((row) => ({
          id: recordId(row),
          title: horseName(row),
          detail: String(row.trainerNotes || 'Chưa có nhận xét từ HLV'),
          path: '/workspace/sessions',
        })),
      },
    ],
  };
}
