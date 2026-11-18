import { taskApi } from '@/features/tasks/api/task-api';
import { workspaceApi } from '@/features/workspace/api/workspace-api';
import { cabinetApi } from '@/features/inventory/api/medicine-cabinet-api';
import { horseApi } from '@/features/horses/api/horse-api';
import { objectId } from '@/shared/types/api';
import { apiClient, requestData } from '@/core/network/api-client';
import { AppError } from '@/core/errors/app-error';
import { queryClient } from '@/core/network/query-client';
import { getModule } from '@/features/workspace/types/catalog';
import { Operation, JsonRecord, asRecord, entityId } from '../types/operation';
export const operationPath = (path: string, id?: string) => {
  if (path.includes(':id') && !id) throw new AppError('Vui lòng chọn hồ sơ từ danh sách.');
  return path.replaceAll(':id', encodeURIComponent(id ?? ''));
};
export function normalizeContext(module: string, data: unknown, id?: string): JsonRecord {
  const root = asRecord(data);
  let row = asRecord(root[getModule(module)?.detailKey ?? '']);
  if (!Object.keys(row).length) row = root;
  if (module === 'prescriptions') {
    const record = asRecord(root.record),
      prescription = asRecord(record.prescription),
      warehouse = asRecord(root.warehouse);
    return {
      ...record,
      revision: prescription.revision,
      lines: prescription.lines,
      warehouseId: warehouse._id,
      stockVersion: warehouse.stockVersion,
      previewHash: root.previewHash,
      _details: root,
    };
  }
  return { ...row, _id: row._id ?? id, _details: root };
}
export const operationsApi = {
  context: async (
    operation: Operation,
    id?: string,
    signal?: AbortSignal,
    page = 1,
    selectedHorseId?: string,
    incidentTarget?: { taskId?: string; stallId?: string },
  ): Promise<JsonRecord> => {
    const cached = asRecord(queryClient.getQueryData(['operation-context', operation.id, id]));
    if (operation.scope === 'collection') {
      if (operation.id === 'incidents.create') {
        if (incidentTarget?.taskId) {
          objectId.parse(incidentTarget.taskId);
          const task = await taskApi.detail(incidentTarget.taskId, signal);
          return {
            taskId: task._id,
            ...(entityId(task.horseId)
              ? { horseId: entityId(task.horseId) }
              : { stallId: entityId(task.stallId) }),
            taskImpact: task.status === 'in_progress' ? 'cannot_continue' : 'cannot_start',
          };
        }
        if (selectedHorseId) {
          objectId.parse(selectedHorseId);
          return { horseId: selectedHorseId };
        }
        if (incidentTarget?.stallId) {
          objectId.parse(incidentTarget.stallId);
          return { stallId: incidentTarget.stallId };
        }
      }
      if (selectedHorseId && ['medical.encounter', 'medical.create'].includes(operation.id)) {
        objectId.parse(selectedHorseId);
        const horse = await horseApi.detail(selectedHorseId, signal);
        return { horseId: horse._id, _selectedHorse: horse };
      }
      return cached;
    }
    const config = getModule(operation.module);
    if (operation.contextPath) {
      const data = await requestData(
        apiClient.get(operationPath(operation.contextPath, id), { signal }),
      );
      return {
        ...cached,
        ...(operation.contextKey ? asRecord(data[operation.contextKey]) : data),
        _id: id,
        _details: data,
      };
    }
    if (operation.module === 'horses') {
      const data = await requestData(apiClient.get(`/horses/${id}`, { signal }));
      const horse = asRecord(data.horse);
      return {
        ...horse,
        ...(operation.id.endsWith('identity')
          ? { ...asRecord(horse.identity), revision: horse.identityRevision }
          : {}),
        _details: data,
      };
    }
    if (operation.module === 'tasks') {
      const data = await requestData(apiClient.get(`/daily-tasks/${id}`, { signal }));
      const task = asRecord(data.task);
      if (operation.id === 'tasks.edit' && task.type === 'training') {
        const options = await requestData(apiClient.get('/daily-tasks/options', { signal }));
        const plan = Array.isArray(options.plans)
          ? options.plans
              .map(asRecord)
              .find((plan) => entityId(plan) === entityId(task.trainingPlanId))
          : undefined;
        return { ...task, trainingPlanRevision: plan?.revision, _details: data };
      }
      return { ...task, _details: data };
    }
    if (config?.unpaged) {
      const data = await requestData(apiClient.get(config.path, { signal }));
      const rows = data[config.key];
      const row = Array.isArray(rows) ? rows.find((item) => entityId(item) === id) : null;
      if (!row) throw new AppError('Hồ sơ không còn trong phạm vi truy cập.');
      return { ...asRecord(row), _details: data };
    }
    if (['training', 'medical', 'injuries'].includes(operation.module)) {
      return workspaceApi.detail(operation.module, id!, signal);
    }
    if (config?.detailKey) {
      const data = await requestData(
        apiClient.get(`${config.path}/${id}`, { params: { page, limit: 100 }, signal }),
      );
      const context = normalizeContext(operation.module, data, id);
      if (
        operation.id === 'schedules.complete' &&
        ['vaccination', 'deworming'].includes(String(context.type))
      )
        context._cabinet = await cabinetApi.get(signal);
      return context;
    }
    if (
      config &&
      ['items', 'warehouses'].includes(operation.module) &&
      Object.keys(cached).length
    ) {
      let page = 1;
      while (true) {
        const data = await requestData(
          apiClient.get(config.path, {
            signal,
            params: { page, limit: 100, search: cached.code ?? cached.name },
          }),
        );
        const rows = data[config.key];
        const found = Array.isArray(rows) ? rows.find((row) => entityId(row) === id) : undefined;
        if (found) return asRecord(found);
        if (page >= Number(asRecord(data.pagination).totalPages ?? 0)) break;
        page++;
      }
      throw new AppError('Hồ sơ không còn khả dụng.');
    }
    if (!Object.keys(cached).length)
      throw new AppError('Hãy mở thao tác từ hồ sơ trong danh sách để lấy dữ liệu hiện tại.');
    return cached;
  },
  submit: async (operation: Operation, id: string | undefined, body: JsonRecord) => {
    const response = await apiClient.request<unknown>({
      url: operationPath(operation.path, id),
      method: operation.method,
      data: body,
      timeout: 60000,
    });
    const envelope = asRecord(response.data);
    if (envelope.success !== true) throw new AppError('Máy chủ không xác nhận thao tác.');
    return envelope.data;
  },
  preview: async (operation: Operation, id: string | undefined, body: JsonRecord) => {
    if (!operation.previewPath) throw new AppError('Thao tác không có bước xem trước.');
    return requestData(
      apiClient.request({
        url: operationPath(operation.previewPath, id),
        method: operation.previewMethod ?? 'post',
        ...(operation.previewMethod === 'get' ? {} : { data: body }),
      }),
    );
  },
};
