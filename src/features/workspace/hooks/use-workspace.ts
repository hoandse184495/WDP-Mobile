import { useInfiniteQuery } from '@tanstack/react-query';
import { workspaceApi } from '../api/workspace-api';
import { asRecord } from '@/features/operations/types/operation';
import type { WorkspaceRecord } from '../types/catalog';

const normalize = (value: string) =>
  value
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
export function filterTrainingPlans(rows: WorkspaceRecord[], search: string, phase: string) {
  const term = normalize(search.trim());
  return rows.filter((row) => {
    const horse = asRecord(row.horseId);
    const names = [
      row.title,
      horse.name,
      horse.registrationCode,
      ...(Array.isArray(row.exercises)
        ? row.exercises.map((exercise) => asRecord(exercise).title)
        : []),
    ];
    return (
      (!phase || row.phase === phase) &&
      (!term || names.some((name) => typeof name === 'string' && normalize(name).includes(term)))
    );
  });
}
export function useWorkspace(
  module: string,
  horseId?: string,
  filters: Record<string, unknown> = {},
) {
  const { search, phase, ...rest } = filters;
  const serverFilters =
    module === 'training'
      ? Object.fromEntries(
          Object.entries(rest).filter(([, value]) => value !== '' && value != null),
        )
      : filters;
  return useInfiniteQuery({
    queryKey: ['workspace', module, horseId, serverFilters],
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const first = await workspaceApi.list(module, pageParam, horseId, signal, serverFilters);
      if (module !== 'training') return first;
      const items = [...first.items];
      for (let page = first.pagination.page + 1; page <= first.pagination.totalPages; page++) {
        const next = await workspaceApi.list(module, page, horseId, signal, serverFilters);
        items.push(...next.items);
      }
      return {
        ...first,
        items,
        pagination: { ...first.pagination, page: 1, totalPages: 1, total: items.length },
      };
    },
    select: (data) =>
      module !== 'training'
        ? data
        : {
            ...data,
            pages: data.pages.map((page) => {
              const items = filterTrainingPlans(
                page.items,
                String(search ?? ''),
                String(phase ?? ''),
              );
              return { ...page, items, pagination: { ...page.pagination, total: items.length } };
            }),
          },
    getNextPageParam: (p) =>
      p.pagination.page < p.pagination.totalPages ? p.pagination.page + 1 : undefined,
  });
}
