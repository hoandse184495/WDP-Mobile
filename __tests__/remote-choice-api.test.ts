import type { InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '@/core/network/api-client';
import { environment } from '@/core/config/environment';
import { loadReferenceOptions } from '@/features/operations/hooks/use-reference-options';
const original = apiClient.defaults.adapter;
const ok = (config: InternalAxiosRequestConfig, data: unknown) => ({
  config,
  status: 200,
  statusText: 'OK',
  headers: {},
  data: { success: true, data },
});
beforeEach(() => {
  environment.apiUrl = 'http://10.0.2.2:3000/api';
});
afterEach(() => {
  apiClient.defaults.adapter = original;
});
test('horse search reaches API with dependency, pagination and cancellation', async () => {
  const calls: InternalAxiosRequestConfig[] = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    return ok(config, {
      horses: [{ _id: 'late', name: 'Ngựa trang sau' }],
      pagination: { page: 2, totalPages: 3 },
    });
  };
  const signal = new AbortController().signal;
  const result = await loadReferenceOptions(
    { path: '/horses', key: 'horses', paged: true, parameter: 'ownerId' },
    'owner',
    undefined,
    ' Ngựa ',
    2,
    signal,
  );
  expect(calls[0]).toMatchObject({
    url: '/horses',
    signal,
    params: { page: 2, limit: 25, search: 'Ngựa', ownerId: 'owner' },
  });
  expect(result.next).toBe(3);
});
test('strict users API searches all scoped pages without unsupported search query', async () => {
  const calls: InternalAxiosRequestConfig[] = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    return ok(config, {
      users:
        config.params.page === 1
          ? [{ _id: 'first', fullName: 'Nguyễn Văn An' }]
          : [{ _id: 'second', fullName: 'Đặng Thị Huyền', email: 'huyen@example.com' }],
      pagination: { page: config.params.page, totalPages: 2 },
    });
  };
  const result = await loadReferenceOptions(
    { path: '/users', key: 'users', paged: true, params: { role: 'horse_owner' } },
    undefined,
    undefined,
    'dang thi huyen',
    1,
  );
  expect(result.rows.map((x) => x._id)).toEqual(['second']);
  expect(result.next).toBeUndefined();
  expect(calls).toHaveLength(2);
  for (const call of calls) {
    expect(call.params.role).toBe('horse_owner');
    expect(call.params.search).toBeUndefined();
  }
});
test('new empty search requests only page one, while aborted search never yields partial matches', async () => {
  const controller = new AbortController(),
    calls: InternalAxiosRequestConfig[] = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    if (calls.length === 2) controller.abort();
    return ok(config, {
      users: [{ _id: 'a', fullName: 'An' }],
      pagination: { page: 1, totalPages: 5 },
    });
  };
  await loadReferenceOptions(
    { path: '/users', key: 'users', paged: true },
    undefined,
    undefined,
    '',
    1,
  );
  expect(calls).toHaveLength(1);
  await expect(
    loadReferenceOptions(
      { path: '/users', key: 'users', paged: true },
      undefined,
      undefined,
      'An',
      1,
      controller.signal,
    ),
  ).rejects.toThrow();
  expect(calls).toHaveLength(2);
});
