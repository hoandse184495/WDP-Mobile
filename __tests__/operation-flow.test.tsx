import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InternalAxiosRequestConfig } from 'axios';
import { Alert } from 'react-native';
import OperationScreen from '@/features/operations/screens/operation-screen';
import { apiClient } from '@/core/network/api-client';
import { environment } from '@/core/config/environment';
import { useSession } from '@/features/auth/stores/session-store';
const id = 'a'.repeat(24),
  lineId = 'b'.repeat(24),
  warehouseId = 'c'.repeat(24);
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ operation: 'prescriptions.issue', id: 'a'.repeat(24) }),
}));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'cda00244-3891-4280-a34c-dea21e0b0930' }));
let client: QueryClient;
let posted: Record<string, unknown>[];
const ok = (config: InternalAxiosRequestConfig, data: unknown) => ({
  config,
  status: 200,
  statusText: 'OK',
  headers: {},
  data: { success: true, data },
});
beforeEach(() => {
  posted = [];
  environment.apiUrl = 'http://10.0.2.2:3000/api';
  useSession.setState({
    status: 'authenticated',
    user: {
      _id: id,
      fullName: 'Thủ kho',
      email: 'keeper@example.com',
      role: 'warehouse_keeper',
      isActive: true,
    },
    error: null,
  });
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  apiClient.defaults.adapter = async (config) => {
    if (config.method === 'post') {
      posted.push(JSON.parse(config.data));
      return ok(config, { issued: true });
    }
    return ok(config, {
      record: {
        _id: id,
        horse: { name: 'Ngựa kiểm thử' },
        prescription: {
          status: 'waiting',
          revision: 8,
          lines: [
            { _id: lineId, name: 'Thuốc A', unit: 'ml', quantity: 10, supplied: 2, remaining: 8 },
          ],
        },
      },
      warehouse: { _id: warehouseId, name: 'Kho thuốc', stockVersion: 17 },
      previewHash: 'f'.repeat(64),
      available: [{ lineId, available: 8 }],
      recipient: { fullName: 'Bác sĩ nhận' },
      issues: [],
    });
  };
});
afterEach(async () => {
  await cleanup();
  client.clear();
  jest.restoreAllMocks();
  useSession.setState({ status: 'guest', user: null });
});
test('issue form requires physical acknowledgment and submits fresh concurrency guards', async () => {
  await render(
    <QueryClientProvider client={client}>
      <OperationScreen />
    </QueryClientProvider>,
  );
  await screen.findByText('Xuất đủ thuốc và bàn giao');
  expect(screen.queryByLabelText('Số lượng *')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Ghi chú *'), 'Đã kiểm đủ thuốc và người nhận');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu và xác nhận' }));
  expect(await screen.findByText(/cần xác nhận đã kiểm tra thực tế/)).toBeTruthy();
  expect(posted).toEqual([]);
  await fireEvent.press(screen.getByRole('button', { name: /Đã đối chiếu và bàn giao thực tế/ }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Có / Xác nhận' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu và xác nhận' }));
  await waitFor(() => expect(posted).toHaveLength(1));
  expect(posted[0]).toMatchObject({
    revision: 8,
    warehouseId,
    stockVersion: 17,
    previewHash: 'f'.repeat(64),
    physicallyHandedOver: true,
    lines: [{ lineId, quantity: 8 }],
  });
});
test('direct link to issuing is blocked for a manager before fetching protected data', async () => {
  useSession.setState({
    user: {
      _id: id,
      fullName: 'Manager',
      email: 'manager@example.com',
      role: 'club_manager',
      isActive: true,
    },
  });
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => ok(config, {}));
  apiClient.defaults.adapter = adapter;
  await render(
    <QueryClientProvider client={client}>
      <OperationScreen />
    </QueryClientProvider>,
  );
  expect(await screen.findByText('Không có quyền truy cập')).toBeTruthy();
  expect(adapter).not.toHaveBeenCalled();
});
