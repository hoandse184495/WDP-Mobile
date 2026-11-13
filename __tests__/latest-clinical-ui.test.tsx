import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession } from '@/features/auth/stores/session-store';
import { AppError } from '@/core/errors/app-error';
import { clubDate } from '@/core/utils/date';
import HealthDossierScreen from '@/features/horses/components/health-dossier-screen';
import MedicineCabinetScreen from '@/features/inventory/components/medicine-cabinet-screen';
import { CareCompletionFields } from '@/features/medical/components/care-completion-fields';
import { dossierApi } from '@/features/horses/api/health-dossier-api';
import { cabinetApi } from '@/features/inventory/api/medicine-cabinet-api';
import { dossierSchema } from '@/features/horses/types/health-dossier';
import { asRecord, type JsonRecord } from '@/features/operations/types/operation';
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'a'.repeat(24) }),
  Redirect: () => null,
}));
jest.mock('@/features/horses/api/health-dossier-api', () => ({ dossierApi: { get: jest.fn() } }));
jest.mock('@/features/inventory/api/medicine-cabinet-api', () => ({
  ...jest.requireActual('@/features/inventory/api/medicine-cabinet-api'),
  cabinetApi: { get: jest.fn() },
}));
jest.mock('@/features/medical/components/surface-location-field', () => ({
  SurfaceLocationField: () => null,
}));
jest.mock('@/shared/components/date-field', () => ({
  DateField: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => {
    const { TextInput } = require('react-native');
    return <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} />;
  },
}));
const id = 'a'.repeat(24),
  itemId = 'b'.repeat(24),
  warehouseId = 'c'.repeat(24);
const clients: QueryClient[] = [];
async function mount(element: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  clients.push(client);
  await render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
  return client;
}
const dossier = () =>
  dossierSchema.parse({
    restricted: false,
    today: clubDate(),
    horse: { _id: id, name: 'Thanh Phong', registrationCode: 'AP-206' },
    records: [
      {
        _id: 'r1',
        examinationDate: clubDate() + 'T01:00:00Z',
        diagnosis: 'Đã ghi nhận khám',
        prescription: {
          status: 'fulfilled',
          lines: [{ name: 'Sản phẩm A', quantity: 2, supplied: 2, remaining: 0, unit: 'ml' }],
        },
      },
    ],
    schedules: [],
    injuries: [],
  });
const stock = {
  warehouse: { _id: warehouseId, name: 'Tủ thú y', stockVersion: 7 },
  items: [
    {
      _id: itemId,
      name: 'Sản phẩm A',
      code: 'MED-01',
      unit: 'ml',
      strength: 'Nồng độ',
      dosageForm: 'Dung dịch',
      available: 5,
      lots: [{ code: 'LOT-01', expiresOn: '2027-01-01', quantity: 5 }],
    },
  ],
};
beforeEach(() => {
  jest.clearAllMocks();
  useSession.setState({
    status: 'authenticated',
    user: {
      _id: id,
      fullName: 'Chủ ngựa',
      email: 'owner@example.com',
      role: 'horse_owner',
      isActive: true,
    },
    error: null,
  });
  jest.mocked(dossierApi.get).mockResolvedValue(dossier());
  jest.mocked(cabinetApi.get).mockResolvedValue(stock);
});
afterEach(async () => {
  await cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  useSession.setState({ status: 'guest', user: null });
});

test('owner reads one clinical visit and opens its prescription without rendering raw objects', async () => {
  await mount(<HealthDossierScreen />);
  expect(await screen.findByText('Đã ghi nhận khám')).toBeTruthy();
  expect(screen.queryByText('Sản phẩm A')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Xem lần khám và thuốc' }));
  expect(screen.getByText('Sản phẩm A')).toBeTruthy();
  expect(screen.getByText('2 / 2 / 0 ml')).toBeTruthy();
  expect(screen.queryByText('[object Object]')).toBeNull();
});
test('dossier refetch denial discards previously shown clinical data', async () => {
  const client = await mount(<HealthDossierScreen />);
  await screen.findByText('Đã ghi nhận khám');
  jest.mocked(dossierApi.get).mockRejectedValue(new AppError('Không còn quyền xem', 403));
  await client.invalidateQueries({ queryKey: ['horse-health-dossier'] });
  expect(await screen.findByText('Không còn quyền xem')).toBeTruthy();
  expect(screen.queryByText('Đã ghi nhận khám')).toBeNull();
});
test('candidate restriction is presented without detailed cards', async () => {
  jest.mocked(dossierApi.get).mockResolvedValue({
    ...dossier(),
    restricted: true,
    restrictionReason: 'Chờ tiếp nhận chính thức',
  });
  await mount(<HealthDossierScreen />);
  expect(await screen.findByText('Chờ tiếp nhận chính thức')).toBeTruthy();
  expect(screen.queryByText('Đã ghi nhận khám')).toBeNull();
});
test('Groom cannot open the clinical dossier or make its API request', async () => {
  useSession.setState({ user: { ...useSession.getState().user!, role: 'groom' } });
  await mount(<HealthDossierScreen />);
  expect(await screen.findByText('Không có quyền truy cập')).toBeTruthy();
  expect(dossierApi.get).not.toHaveBeenCalled();
});
test('owner cannot open the cabinet; vet sees eligible quantities and expands lot details', async () => {
  await mount(<MedicineCabinetScreen />);
  expect(await screen.findByText('Không có quyền truy cập')).toBeTruthy();
  expect(cabinetApi.get).not.toHaveBeenCalled();
  await cleanup();
  useSession.setState({ user: { ...useSession.getState().user!, role: 'veterinarian' } });
  await mount(<MedicineCabinetScreen />);
  await screen.findByText('Sản phẩm A');
  expect(screen.getByText('5 ml')).toBeTruthy();
  expect(screen.queryByText(/LOT-01/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Xem các lô còn hạn' }));
  expect(screen.getByText(/LOT-01/)).toBeTruthy();
});
test('care form chooses stock item and keeps current stock version', async () => {
  let current: JsonRecord = {};
  function Form() {
    const [payload, setPayload] = useState<JsonRecord>({
      administration: { performedOn: clubDate(), dose: '' },
      stockIssue: { warehouseId, stockVersion: 7 },
    });
    current = payload;
    return (
      <CareCompletionFields
        payload={payload}
        context={{ _cabinet: stock, type: 'vaccination', repeatDays: 30 }}
        onChange={setPayload}
      />
    );
  }
  await mount(<Form />);
  await fireEvent.press(screen.getByRole('button', { name: 'Vaccine từ tủ thuốc' }));
  await fireEvent.press(screen.getByRole('radio', { name: /Sản phẩm A/ }));
  await fireEvent.changeText(screen.getByLabelText('Lượng thực tế xuất (ml)'), '2');
  expect(asRecord(current.stockIssue)).toMatchObject({
    warehouseId,
    stockVersion: 7,
    itemId,
    quantity: '2',
  });
  expect(asRecord(current.administration).productName).toBe('Sản phẩm A');
  await fireEvent.changeText(screen.getByLabelText('Ngày thực hiện thực tế'), '');
  expect(current.nextDueDate).toBeNull();
});
