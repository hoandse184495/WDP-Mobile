import { useInfiniteQuery } from '@tanstack/react-query';
import { workspaceApi } from '../api/workspace-api';
export function useWorkspace(
  module: string,
  horseId?: string,
  filters: Record<string, unknown> = {},
) {
  return useInfiniteQuery({
    queryKey: ['workspace', module, horseId, filters],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      workspaceApi.list(module, pageParam, horseId, signal, filters),
    getNextPageParam: (p) =>
      p.pagination.page < p.pagination.totalPages ? p.pagination.page + 1 : undefined,
  });
}
