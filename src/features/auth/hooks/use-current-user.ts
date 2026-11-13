import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth-api';
import { authKeys } from '../api/auth-keys';
import { useSession } from '../stores/session-store';
import { signOut } from '../utils/session';

export function useCurrentUser() {
  const client = useQueryClient();
  const principal = useSession((state) => state.user);
  const status = useSession((state) => state.status);
  const query = useQuery({
    queryKey: authKeys.me,
    queryFn: ({ signal }) => authApi.me(signal),
    enabled: status === 'authenticated',
    staleTime: 30000,
    retry: false,
    refetchOnWindowFocus: 'always',
  });
  useEffect(() => {
    const current = useSession.getState();
    if (
      current.status !== 'authenticated' ||
      !current.user ||
      !query.data ||
      client.getQueryData(authKeys.me) !== query.data
    )
      return;
    if (query.data._id !== current.user._id || query.data.role !== current.user.role) {
      void signOut('expired');
    } else if (
      query.data.fullName !== current.user.fullName ||
      query.data.email !== current.user.email ||
      query.data.phone !== current.user.phone
    ) {
      useSession.setState({ user: query.data });
    }
  }, [query.data, principal, status, client]);
  return query;
}
