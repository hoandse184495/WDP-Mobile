import { environment } from '@/core/config/environment';
beforeEach(() => {
  environment.apiUrl = 'http://10.0.2.2:3000/api';
});
import { apiClient } from '@/core/network/api-client';
import { workspaceApi } from '@/features/workspace/api/workspace-api';
import { operationsApi } from '@/features/operations/api/operations-api';
import { findOperation } from '@/features/operations/contracts/registry';
const original = apiClient.defaults.adapter;
afterEach(() => {
  apiClient.defaults.adapter = original;
});
test.each([
  ['training', 'plans', '/training-plans'],
  ['medical', 'records', '/medical-records'],
  ['injuries', 'injuries', '/injuries'],
])(
  '%s detail re-reads all scoped pages without the removed GET id endpoint',
  async (module, key, path) => {
    const calls: string[] = [];
    apiClient.defaults.adapter = async (config) => {
      calls.push(config.url!);
      const page = Number(config.params.page);
      return {
        config,
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {
          success: true,
          data: {
            [key]: [{ _id: page === 1 ? 'other' : 'target', revision: 7 }],
            pagination: { page, limit: 20, total: 21, totalPages: 2 },
          },
        },
      };
    };
    expect(await workspaceApi.detail(module, 'target')).toMatchObject({
      _id: 'target',
      revision: 7,
    });
    expect(calls).toEqual([path, path]);
  },
);
test('removed detail lookup fails closed for a record outside authorized results', async () => {
  apiClient.defaults.adapter = async (config) => ({
    config,
    status: 200,
    statusText: 'OK',
    headers: {},
    data: {
      success: true,
      data: { records: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    },
  });
  await expect(workspaceApi.detail('medical', 'not-owned')).rejects.toMatchObject({ status: 404 });
});
test('medical edit context reads the current authorized collection rather than the deleted GET endpoint', async () => {
  apiClient.defaults.adapter = async (config) => {
    expect(config.url).toBe('/medical-records');
    return {
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: {
        success: true,
        data: {
          records: [{ _id: 'exam', diagnosis: 'Updated diagnosis' }],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      },
    };
  };
  expect(await operationsApi.context(findOperation('medical.edit')!, 'exam')).toMatchObject({
    diagnosis: 'Updated diagnosis',
  });
});
test('retired workflow actions are no longer exposed', () => {
  for (const id of [
    'rations.submit',
    'rations.decision',
    'rations.direct',
    'tasks.checkpoint',
    'incidents.link',
    'schedules.link',
  ])
    expect(findOperation(id)).toBeUndefined();
  expect(findOperation('incidents.encounter')?.contextPath).toBeUndefined();
  expect(findOperation('tasks.telemetry-stop')?.roles).toEqual(
    expect.arrayContaining(['club_manager', 'head_trainer', 'groom']),
  );
});
