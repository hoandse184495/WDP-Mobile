import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { horseApi } from '../api/horse-api';
export function useHorses(search = '') {
  return useInfiniteQuery({
    queryKey: ['horses', search],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      horseApi.list({ page: pageParam, limit: 20, search: search || undefined }, signal),
    getNextPageParam: (page) =>
      page.pagination.page < page.pagination.totalPages ? page.pagination.page + 1 : undefined,
  });
}
export function useHorse(id: string) {
  return useQuery({
    queryKey: ['horse', id],
    queryFn: ({ signal }) => horseApi.detail(id, signal),
  });
}
