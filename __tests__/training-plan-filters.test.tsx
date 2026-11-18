import { renderHook, waitFor, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useWorkspace } from '@/features/workspace/hooks/use-workspace';
import { workspaceApi } from '@/features/workspace/api/workspace-api';
jest.mock('@/features/workspace/api/workspace-api', () => ({ workspaceApi: { list: jest.fn() } }));
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  jest.clearAllMocks();
});
function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={clients[clients.length - 1]}>{children}</QueryClientProvider>;
}
function prepare() {
  clients.push(
    new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } }),
  );
}
test('search and phase include later pages and do not send unsupported filters or refetch on typing', async () => {
  prepare();
  jest.mocked(workspaceApi.list).mockImplementation(async (_module, page) => ({
    items:
      page === 1
        ? [{ _id: 'a', title: 'Giáo án A', phase: 'build_up' }]
        : [
            {
              _id: 'b',
              title: 'Sức bền',
              phase: 'endurance',
              horseId: { name: 'Thiên Phong', registrationCode: 'AP-201' },
            },
          ],
    pagination: { page, limit: 1, total: 2, totalPages: 2 },
  }));
  const hook = await renderHook(
    ({ search, phase }: { search: string; phase: string }) =>
      useWorkspace('training', undefined, { search, phase }),
    { initialProps: { search: 'thien phong', phase: 'endurance' }, wrapper },
  );
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  expect(hook.result.current.data?.pages[0].items.map((row) => row._id)).toEqual(['b']);
  expect(hook.result.current.data?.pages[0].pagination.total).toBe(1);
  expect(hook.result.current.hasNextPage).toBe(false);
  expect(workspaceApi.list).toHaveBeenCalledTimes(2);
  expect(
    jest
      .mocked(workspaceApi.list)
      .mock.calls.every((call) => Object.keys(call[4] ?? {}).length === 0),
  ).toBe(true);
  await hook.rerender({ search: '', phase: '' });
  expect(hook.result.current.data?.pages[0].items).toHaveLength(2);
  expect(workspaceApi.list).toHaveBeenCalledTimes(2);
});
test('horse scope and false status are passed unchanged to the backend', async () => {
  prepare();
  jest
    .mocked(workspaceApi.list)
    .mockResolvedValue({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  const hook = await renderHook(
    () => useWorkspace('training', 'horse-1', { isActive: 'false', search: '', phase: '' }),
    { wrapper },
  );
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  expect(workspaceApi.list).toHaveBeenCalledWith('training', 1, 'horse-1', expect.anything(), {
    isActive: 'false',
  });
});
