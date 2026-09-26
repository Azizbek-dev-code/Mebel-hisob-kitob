import { homePathForAuth } from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { authQueryKeys, useCurrentUser } from '@/features/auth/hooks/use-auth';
import { accountsService } from '@/services/accounts.service';

export const accountsQueryKey = ['accounts'] as const;

export function useAccountWorkspaces(options?: { enabled?: boolean }) {
  const { data: user } = useCurrentUser();
  const enabled = options?.enabled ?? Boolean(user);
  return useQuery({
    queryKey: accountsQueryKey,
    queryFn: ({ signal }) => accountsService.list(signal),
    enabled: Boolean(user) && enabled,
  });
}

export function useSwitchWorkspace() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (workspaceId: string) => accountsService.switch({ workspaceId }),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(authQueryKeys.currentUser, user);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
      navigate(homePathForAuth(user), { replace: true });
    },
  });
}
