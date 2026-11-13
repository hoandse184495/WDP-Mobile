import { AxiosError, AxiosHeaders } from 'axios';
import { apiClient, onUnauthorized, requestData, setApiToken } from '@/core/network/api-client';
import { environment } from '@/core/config/environment';
import { horseApi } from '@/features/horses/api/horse-api';
import { taskApi } from '@/features/tasks/api/task-api';
import { notificationApi } from '@/features/notifications/api/notification-api';
import { loadDashboard } from '@/features/home/api/dashboard-api';
jest.mock('@/core/network/photo-upload', () => ({ pickAndUploadPhoto: jest.fn() }));
beforeEach(() => {
  environment.apiUrl = 'http://10.0.2.2:3000/api';
  setApiToken(null);
  onUnauthorized(() => {});
});
const pagination = { page: 1, limit: 20, total: 0, totalPages: 0 };
test.each(['club_manager', 'head_trainer'] as const)(
  '%s dashboard reads the nested backend dashboard and preserves metrics and alerts',
  async (role) => {
    const alerts = [
      { id: 'session-1', horse: { name: 'Thunder' }, alertMessage: 'High heart rate' },
    ];
    apiClient.defaults.adapter = async (config) => {
      expect(config.url).toBe('/dashboard/head-trainer');
      expect(config.params).toEqual({ days: 30, recentLimit: 5 });
      return {
        config,
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {
          success: true,
          data: {
            dashboard: {
              summary: {
                totalHorses: 12,
                activeTrainingPlans: 8,
                sessions: 30,
                pendingReviews: 4,
                trainingLocked: 2,
                alerts: 3,
                averageFitnessScore: null,
              },
              recentAlerts: alerts,
            },
          },
        },
      };
    };
    const dashboard = await loadDashboard(role);
    expect(dashboard.metrics.map((metric) => metric.value)).toEqual([12, 8, 30, 4, 2, 3]);
    expect(dashboard.alerts).toEqual(alerts);
  },
);
test('dashboard rejects a malformed nested response instead of inventing totals', async () => {
  apiClient.defaults.adapter = async (config) => ({
    config,
    status: 200,
    statusText: 'OK',
    headers: {},
    data: { success: true, data: { dashboard: {} } },
  });
  await expect(loadDashboard('club_manager')).rejects.toThrow();
});
test.each(['veterinarian', 'groom', 'horse_owner'] as const)(
  '%s dashboard uses the scoped horse total',
  async (role) => {
    apiClient.defaults.adapter = async (config) => {
      expect(config.url).toBe('/horses');
      return {
        config,
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {
          success: true,
          data: { horses: [], pagination: { ...pagination, total: 7, totalPages: 7 } },
        },
      };
    };
    const dashboard = await loadDashboard(role);
    expect(dashboard.metrics).toEqual([
      { label: role === 'horse_owner' ? 'Ngựa của bạn' : 'Ngựa trong phạm vi', value: 7 },
    ]);
    expect(dashboard.alerts).toEqual([]);
  },
);
test('warehouse dashboard loads warehouse and pending queue totals', async () => {
  const totals: Record<string, number> = {
    '/inventory/warehouses': 2,
    '/prescriptions': 3,
    '/inventory/replenishments': 4,
  };
  apiClient.defaults.adapter = async (config) => {
    expect(Object.keys(totals)).toContain(config.url);
    expect(config.params).toEqual({
      page: 1,
      limit: 1,
      ...(config.url === '/prescriptions' ? { status: 'waiting' } : {}),
      ...(config.url === '/inventory/replenishments' ? { status: 'pending' } : {}),
    });
    return {
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { success: true, data: { pagination: { total: totals[config.url!] } } },
    };
  };
  const dashboard = await loadDashboard('warehouse_keeper');
  expect(dashboard.metrics.map((metric) => metric.value)).toEqual([2, 3, 4]);
  expect(dashboard.alerts).toEqual([]);
});
test('horses passes search and pagination and unwraps the backend envelope', async () => {
  apiClient.defaults.adapter = async (config) => {
    expect(config.url).toBe('/horses');
    expect(config.params).toEqual({ page: 1, limit: 20, search: 'horse' });
    return {
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { success: true, data: { horses: [], pagination } },
    };
  };
  expect(await horseApi.list({ page: 1, limit: 20, search: 'horse' })).toEqual({
    items: [],
    pagination,
  });
});
test('task list supplies required date and never invents a status', async () => {
  apiClient.defaults.adapter = async (config) => {
    expect(config.params).toEqual({ date: '2026-01-01', page: 1, limit: 20, status: undefined });
    return {
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { success: true, data: { tasks: [], pagination } },
    };
  };
  expect((await taskApi.list('2026-01-01', 1)).items).toEqual([]);
});
test('notifications maps readAt instead of assuming a backend isRead property', async () => {
  apiClient.defaults.adapter = async (config) => ({
    config,
    status: 200,
    statusText: 'OK',
    headers: {},
    data: {
      success: true,
      data: {
        notifications: [
          {
            _id: 'n1',
            title: 'Task',
            message: 'Assigned',
            readAt: null,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        pagination: { ...pagination, total: 1, totalPages: 1 },
        unreadCount: 1,
        serverNow: '2026-01-01T00:00:00Z',
      },
    },
  });
  expect((await notificationApi.list(1, false)).items[0].isRead).toBe(false);
});
test('malformed API data is an error, never an empty successful list', async () => {
  apiClient.defaults.adapter = async (config) => ({
    config,
    status: 200,
    statusText: 'OK',
    headers: {},
    data: { success: true, data: {} },
  });
  await expect(horseApi.list({ page: 1 })).rejects.toThrow();
  await expect(requestData(Promise.resolve({ data: { success: false } }))).rejects.toThrow(
    'Phản hồi API',
  );
});
test('401 expires current session but does not expire login or a newer session', async () => {
  const expire = jest.fn();
  onUnauthorized(expire);
  setApiToken('test-session');
  apiClient.defaults.adapter = async (config) => {
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
      config,
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      data: { message: 'Expired' },
    });
  };
  await expect(apiClient.get('/auth/me')).rejects.toThrow('Expired');
  expect(expire).toHaveBeenCalledTimes(1);
  expire.mockClear();
  await expect(apiClient.post('/auth/login', {})).rejects.toThrow();
  expect(expire).not.toHaveBeenCalled();
  apiClient.defaults.adapter = async (config) => {
    setApiToken('new-session');
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
      config,
      status: 401,
      statusText: '',
      headers: new AxiosHeaders(),
      data: {},
    });
  };
  await expect(apiClient.get('/horses')).rejects.toThrow();
  expect(expire).not.toHaveBeenCalled();
});
