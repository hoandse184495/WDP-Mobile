import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../api/task-api';
export function useTasks(date: string, status = '') {
  return useInfiniteQuery({
    queryKey: ['tasks', date, status],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => taskApi.list(date, pageParam, status, signal),
    getNextPageParam: (p) =>
      p.pagination.page < p.pagination.totalPages ? p.pagination.page + 1 : undefined,
  });
}
export function useTask(id: string) {
  return useQuery({ queryKey: ['task', id], queryFn: ({ signal }) => taskApi.detail(id, signal) });
}
export function useRefreshTask(id: string) {
  const client = useQueryClient();
  return async () => {
    await Promise.all(
      [
        'task',
        'tasks',
        'evidence',
        'feeding',
        'telemetry',
        'horses',
        'horse',
        'dashboard',
        'workspace',
        'notifications',
      ].map((key) =>
        client.invalidateQueries({
          queryKey: ['task', 'evidence', 'feeding', 'telemetry'].includes(key) ? [key, id] : [key],
        }),
      ),
    );
  };
}
