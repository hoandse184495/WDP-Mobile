import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HorseDocuments } from '@/features/horses/components/horse-documents';
import { horseDocumentsApi, type HorseDocument } from '@/features/horses/api/horse-documents-api';
import { useSession } from '@/features/auth/stores/session-store';
import { TaskTelemetry } from '@/features/tasks/components/task-telemetry';
import { apiClient } from '@/core/network/api-client';
import { environment } from '@/core/config/environment';
jest.mock('@/features/horses/api/horse-documents-api', () => ({
  horseDocumentsApi: { list: jest.fn(), upload: jest.fn(), open: jest.fn(), remove: jest.fn() },
}));
const mockRefetch = jest.fn(async () => undefined);
jest.mock('@/features/tasks/hooks/use-telemetry', () => ({
  useTelemetry: () => ({
    liveStatus: 'connected',
    refetch: mockRefetch,
    data: { run: { status: 'running', totalSamples: 0, samples: [], summary: {}, alerts: [] } },
  }),
}));
jest.mock('@/features/tasks/hooks/use-tasks', () => ({
  useRefreshTask: () => async () => undefined,
}));
const clients: QueryClient[] = [];
const adapter = apiClient.defaults.adapter;
const document: HorseDocument = {
  _id: 'd1',
  horseId: 'h1',
  title: 'Hộ chiếu',
  fileName: 'passport.pdf',
  mimeType: 'application/pdf',
  size: 1024,
  source: 'horse',
  canDelete: true,
  createdAt: '2026-11-18',
};
const wrap = async (element: React.ReactElement) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(client);
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
};
function role(value: 'club_manager' | 'horse_owner') {
  useSession.setState({
    status: 'authenticated',
    user: { _id: 'u1', fullName: 'User', email: 'user@example.com', isActive: true, role: value },
  });
}
afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  apiClient.defaults.adapter = adapter;
  jest.clearAllMocks();
});
test('owner can open a document but cannot upload or delete, even if an old response has canDelete true', async () => {
  role('horse_owner');
  jest.mocked(horseDocumentsApi.list).mockResolvedValue([document]);
  await wrap(<HorseDocuments id="h1" />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Mở / chia sẻ: Hộ chiếu' }));
  expect(horseDocumentsApi.open).toHaveBeenCalledWith('h1', document);
  expect(screen.queryByRole('button', { name: 'Chọn và tải giấy tờ' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Xóa giấy tờ' })).toBeNull();
});
test('manager can upload direct documents while legacy documents stay read-only', async () => {
  role('club_manager');
  jest
    .mocked(horseDocumentsApi.list)
    .mockResolvedValue([{ ...document, source: 'admission', canDelete: false }]);
  await wrap(<HorseDocuments id="h1" />);
  expect(await screen.findByText('Hộ chiếu')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Chọn và tải giấy tờ' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Xóa giấy tờ' })).toBeNull();
});
test('manager emergency stop submits to the current telemetry stop route and refreshes the run', async () => {
  role('club_manager');
  environment.apiUrl = 'http://10.0.2.2:3000/api';
  const calls: string[] = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config.url!);
    return {
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { success: true, data: {} },
    };
  };
  await wrap(<TaskTelemetry id="t1" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Dừng khẩn cấp và chốt số liệu' }));
  await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
  expect(calls).toEqual(['/daily-tasks/t1/telemetry/stop']);
});
