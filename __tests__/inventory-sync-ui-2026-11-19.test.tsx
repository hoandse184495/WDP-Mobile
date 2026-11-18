import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReferenceField } from '@/features/operations/components/reference-field';
import { findOperation } from '@/features/operations/contracts/registry';
import { useSession } from '@/features/auth/stores/session-store';
import { apiClient } from '@/core/network/api-client';
import { environment } from '@/core/config/environment';
import { FeedForecastOverview } from '@/features/inventory/components/feed-forecast-overview';
const id = 'a'.repeat(24),
  other = 'b'.repeat(24);
const adapter = apiClient.defaults.adapter;
let client: QueryClient;
afterEach(() => {
  cleanup();
  client?.clear();
  apiClient.defaults.adapter = adapter;
});

test('warehouse editor selects multiple Grooms by name and removes just the chosen assignment', async () => {
  environment.apiUrl = 'http://10.0.2.2:3000/api';
  useSession.setState({
    status: 'authenticated',
    user: {
      _id: 'keeper',
      fullName: 'Thủ kho',
      email: 'keeper@example.com',
      isActive: true,
      role: 'warehouse_keeper',
    },
  });
  apiClient.defaults.adapter = async (config) => {
    expect(config.url).toBe('/inventory/options');
    return {
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: {
        success: true,
        data: {
          grooms: [
            { _id: id, fullName: 'Groom A' },
            { _id: other, fullName: 'Groom B' },
          ],
        },
      },
    };
  };
  const changed = jest.fn();
  function Editor() {
    const [selected, setSelected] = useState<string[]>([id]);
    return (
      <ReferenceField
        operation={findOperation('warehouses.edit')!}
        path="assignedGroomIds"
        value={selected}
        payload={{}}
        context={{ assignedGroomIds: [{ _id: id, fullName: 'Groom A' }] }}
        onChange={(value) => {
          changed(value);
          setSelected(value as string[]);
        }}
      />
    );
  }
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await render(
    <QueryClientProvider client={client}>
      <Editor />
    </QueryClientProvider>,
  );
  await screen.findByRole('button', { name: 'Bỏ Groom A' });
  await fireEvent.press(screen.getByRole('button', { name: 'Thêm Groom phụ trách' }));
  await fireEvent.press(await screen.findByRole('radio', { name: 'Groom B' }));
  expect(changed).toHaveBeenLastCalledWith([id, other]);
  await fireEvent.press(await screen.findByRole('button', { name: 'Bỏ Groom A' }));
  expect(changed).toHaveBeenLastCalledWith([other]);
});
test('forecast cards display shortage and both warehouse balances without a wide table', async () => {
  await render(
    <FeedForecastOverview
      data={{
        day: '2026-11-19',
        days: 7,
        summaryItems: [
          {
            itemId: id,
            name: 'Cỏ khô',
            code: 'FEED',
            unit: 'kg',
            dailyNeed: 25,
            sevenDayNeed: 175,
            centralStock: 80,
            branchStock: 31,
            totalStock: 111,
            shortage7d: 64,
          },
        ],
        areas: [{ stableId: other, stableName: 'Khu A', horseCount: 2, items: [] }],
      }}
    />,
  );
  expect(screen.getByText('Thiếu 64 kg')).toBeTruthy();
  expect(screen.getByText('80 kg')).toBeTruthy();
  expect(screen.getByText('31 kg')).toBeTruthy();
  expect(screen.getByText('2 ngựa đang lưu trú')).toBeTruthy();
  expect(screen.getByText('Chưa có nhu cầu từ khẩu phần hiệu lực.')).toBeTruthy();
});
test('forecast without approved rations has an explicit empty state', async () => {
  await render(
    <FeedForecastOverview data={{ day: '2026-11-19', days: 7, summaryItems: [], areas: [] }} />,
  );
  expect(screen.getByText(/Chưa có dữ liệu dự báo thức ăn/)).toBeTruthy();
});
