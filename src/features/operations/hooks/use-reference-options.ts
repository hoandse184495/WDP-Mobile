import { useInfiniteQuery } from '@tanstack/react-query';
import { Role } from '@/core/constants/roles';
import { apiClient, requestData } from '@/core/network/api-client';
import { operationPath } from '../api/operations-api';
import {
  Operation,
  ReferenceSource,
  JsonRecord,
  asRecord,
  atPath,
  entityId,
} from '../types/operation';
import { horses, users, warehouses, items, stalls, stables } from '../contracts/define';

export function referencePayload(payload: JsonRecord, path: string): JsonRecord {
  const parent = path.split('.').slice(0, -1).join('.');
  return parent ? { ...payload, ...asRecord(atPath(payload, parent)) } : payload;
}
export function referenceSource(
  operation: Operation,
  key: string,
  role: Role,
  path: string,
): ReferenceSource | undefined {
  if (operation.references?.[key]) return operation.references[key];
  if (operation.module === 'tasks' && ['trainingPlanId', 'trainingExerciseKey'].includes(key))
    return { path: '/daily-tasks/options', key: 'plans' };
  if (operation.module === 'tasks' && ['rationPlanId', 'rationMealKey'].includes(key))
    return { path: '/daily-tasks/options', key: 'rationPlans' };
  if (operation.module === 'rations' && key === 'horseId')
    return { path: '/rations/options', key: 'horses' };
  if (key === 'planId') return { path: '/training-plans', key: 'plans', paged: true };
  if (key === 'horseId')
    return operation.id === 'horses.pedigree'
      ? { path: '/horses/:id/pedigree/options', key: 'horses', paged: true }
      : horses;
  if (key === 'assignedGroomIds') return { path: '/inventory/options', key: 'grooms' };
  if (key === 'responsibleVetId') return { path: '/inventory/options', key: 'vets' };
  if (['ownerId', 'trainerId', 'vetId'].includes(key))
    return users(
      key === 'ownerId' ? 'horse_owner' : key === 'trainerId' ? 'head_trainer' : 'veterinarian',
    );
  if (key === 'groomId' && ['schedules', 'medical'].includes(operation.module))
    return { path: '/stables', key: 'assignments' };
  if (key === 'groomId')
    return role === 'club_manager' ? users('groom') : { path: '/stables', key: 'grooms' };
  if (key === 'stallId') return stalls;
  if (key === 'stableId') return stables;
  if (['warehouseId', 'sourceWarehouseId', 'destinationWarehouseId'].includes(key))
    return warehouses;
  if (key === 'itemId')
    return operation.module === 'rations'
      ? { path: '/rations/options', key: 'items' }
      : operation.module === 'incidents'
        ? { path: '/incidents/options', key: 'items' }
        : items;
  if (['medicalRecordId', 'relatedMedicalRecordId'].includes(key))
    return { path: '/medical-records', key: 'records', paged: true };
  if (key === 'injuryId' || (key === 'id' && path.includes('injur')))
    return { path: '/injuries', key: 'injuries', paged: true };
  if (key === 'id' && path.includes('incident'))
    return { path: '/incidents', key: 'reports', paged: true };
  if (key === 'id' && path.includes('completeSchedule'))
    return { path: '/medical-schedules', key: 'schedules', paged: true };
  if (key === 'taskId')
    return {
      path: '/daily-tasks',
      key: 'tasks',
      paged: true,
      params: { date: new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10) },
    };
  if (key === 'trainingPlanId') return { path: '/training-plans', key: 'plans', paged: true };
  if (key === 'rationPlanId')
    return { path: '/rations', key: 'plans', paged: true, params: { status: 'approved' } };
  if (key === 'replenishmentRequestId')
    return { path: '/inventory/replenishments', key: 'requests', paged: true };
  if (key === 'balanceId')
    return {
      path: '/inventory/stock',
      key: 'balances',
      paged: true,
      dependsOn: 'sourceWarehouseId',
      parameter: 'warehouseId',
    };
  return undefined;
}
export function optionLabel(value: unknown, index: number) {
  const row = asRecord(value),
    item = asRecord(row.item),
    horse = asRecord(row.horseId ?? row.horse);
  const name =
    row.fullName ??
    row.name ??
    row.title ??
    row.number ??
    row.code ??
    item.name ??
    horse.name ??
    row.affectedArea;
  const suffix = row.unit ?? item.unit;
  return `${name ?? `Dòng ${index + 1}`}${suffix ? ` (${suffix})` : ''}${row.quantity !== undefined ? ` · ${row.quantity}` : ''}${asRecord(row.lot).code ? ` · lô ${asRecord(row.lot).code}` : ''}`;
}
export function useReferenceOptions(
  source: ReferenceSource | undefined,
  payload: JsonRecord,
  id?: string,
  search = '',
) {
  const dependency = source?.dependsOn ? entityId(atPath(payload, source.dependsOn)) : undefined;
  return useInfiniteQuery({
    queryKey: ['operation-options', source, dependency, id, search],
    initialPageParam: 1,
    enabled: Boolean(source) && (!source?.dependsOn || Boolean(dependency)),
    queryFn: ({ pageParam, signal }) =>
      loadReferenceOptions(source!, dependency, id, search, pageParam, signal),
    getNextPageParam: (page) => page.next,
  });
}

export function searchableSource(source: ReferenceSource | undefined) {
  return Boolean(
    source &&
    (['/horses', '/inventory/items', '/inventory/warehouses', '/inventory/stock'].includes(
      source.path,
    ) ||
      source.path.endsWith('/pedigree/options')),
  );
}

export const normalizeSearch = (value: string) =>
  value
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
export async function loadReferenceOptions(
  source: ReferenceSource,
  dependency: string | undefined,
  id: string | undefined,
  search: string,
  pageParam: number,
  signal?: AbortSignal,
) {
  const acrossPages = Boolean(search.trim() && source.paged && !searchableSource(source));
  const rows: JsonRecord[] = [];
  let page = pageParam;
  let next: number | undefined;
  do {
    const data = await requestData(
      apiClient.get(operationPath(source.path, id), {
        signal,
        params: {
          ...source.params,
          ...(source.paged
            ? {
                page,
                limit: 25,
                ...(search.trim() && searchableSource(source) ? { search: search.trim() } : {}),
              }
            : {}),
          ...(source.parameter && dependency ? { [source.parameter]: dependency } : {}),
        },
      }),
    );
    const found = atPath(data, source.key);
    if (!Array.isArray(found)) throw new Error('Không nhận được danh sách lựa chọn từ máy chủ.');
    rows.push(...found.map(asRecord));
    const pagination = asRecord(data.pagination);
    next =
      source.paged && Number(pagination.page) < Number(pagination.totalPages)
        ? page + 1
        : undefined;
    if (!acrossPages || !next) break;
    page = next;
  } while (!signal?.aborted);
  if (signal?.aborted) throw new Error('Đã hủy tìm kiếm.');
  const needle = normalizeSearch(search.trim());
  return {
    rows: acrossPages
      ? rows.filter((row, i) =>
          normalizeSearch(
            [optionLabel(row, i), row.registrationCode, row.email, row.code]
              .filter(Boolean)
              .join(' '),
          ).includes(needle),
        )
      : rows,
    next: acrossPages ? undefined : next,
  };
}
