import { QueryClient } from '@tanstack/react-query';
import { AppError } from '@/core/errors/app-error';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: (count, error) =>
        !(error instanceof AppError && error.status && error.status < 500) && count < 1,
    },
    mutations: { retry: false },
  },
});
