import { z } from 'zod';
import { feedForecastApi } from '@/features/inventory/api/feed-forecast-api';
import { apiClient, requestData } from '@/core/network/api-client';
import { horseApi } from '@/features/horses/api/horse-api';
import { Role } from '@/core/constants/roles';
const dashboardSchema = z.object({
  summary: z.object({
    totalHorses: z.number(),
    activeTrainingPlans: z.number(),
    sessions: z.number(),
    alerts: z.number(),
    pendingReviews: z.number(),
    trainingLocked: z.number(),
    averageFitnessScore: z.number().nullable(),
    healthStatus: z
      .object({
        ready: z.number(),
        monitoring: z.number(),
        injured: z.number(),
        isolated: z.number(),
      })
      .optional(),
  }),
  recentAlerts: z.array(
    z.object({
      id: z.string(),
      horse: z.object({ name: z.string() }).nullable(),
      alertMessage: z.string().optional(),
      alertType: z.string().optional(),
    }),
  ),
  horseProgress: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        fitnessScore: z.number().nullable().optional(),
        healthStatus: z.string(),
        isTrainingLocked: z.boolean(),
        activePlan: z.object({ title: z.string() }).nullable(),
      }),
    )
    .optional(),
  activityByDay: z
    .array(
      z.object({
        date: z.string(),
        sessions: z.number(),
        alerts: z.number(),
        averageSpeed: z.number().nullable(),
        averageHeartRate: z.number().nullable(),
      }),
    )
    .optional(),
});
export async function loadDashboard(role: Role, signal?: AbortSignal) {
  if (role === 'warehouse_keeper') {
    const [results, feedForecast] = await Promise.all([
      Promise.all([
        requestData(
          apiClient.get('/inventory/warehouses', { params: { page: 1, limit: 1 }, signal }),
        ),
        requestData(
          apiClient.get('/prescriptions', {
            params: { page: 1, limit: 1, status: 'waiting' },
            signal,
          }),
        ),
        requestData(
          apiClient.get('/inventory/replenishments', {
            params: { page: 1, limit: 1, status: 'pending' },
            signal,
          }),
        ),
      ]),
      feedForecastApi.get(signal),
    ]);
    return {
      feedForecast,
      metrics: results.map((data, index) => ({
        label: ['Kho được quản lý', 'Đơn thuốc chờ cấp', 'Yêu cầu bổ sung chờ xử lý'][index],
        value: z.object({ total: z.number() }).parse(data.pagination).total,
      })),
      alerts: [],
    };
  }
  if (role === 'club_manager' || role === 'head_trainer') {
    const { dashboard } = z.object({ dashboard: dashboardSchema }).parse(
      await requestData(
        apiClient.get('/dashboard/head-trainer', {
          params: { days: 30, recentLimit: 5 },
          signal,
        }),
      ),
    );
    return {
      metrics: [
        { label: 'Ngựa phụ trách', value: dashboard.summary.totalHorses },
        { label: 'Giáo án đang áp dụng', value: dashboard.summary.activeTrainingPlans },
        { label: 'Buổi tập / 30 ngày', value: dashboard.summary.sessions },
        { label: 'Chờ đánh giá', value: dashboard.summary.pendingReviews },
        { label: 'Khóa huấn luyện', value: dashboard.summary.trainingLocked },
        { label: 'Cảnh báo / 30 ngày', value: dashboard.summary.alerts },
      ],
      alerts: dashboard.recentAlerts,
      progress: dashboard.horseProgress ?? [],
      health: dashboard.summary.healthStatus,
      activity: dashboard.activityByDay,
    };
  }
  const horses = await horseApi.list({ page: 1, limit: 1 }, signal);
  return {
    metrics: [
      {
        label: role === 'horse_owner' ? 'Ngựa của bạn' : 'Ngựa trong phạm vi',
        value: horses.pagination.total,
      },
    ],
    alerts: [],
  };
}
