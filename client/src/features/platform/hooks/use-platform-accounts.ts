import { useQuery } from '@tanstack/react-query';
import type { PlatformAccountListQuery } from '@furniture-erp/shared';

import { platformAccountsService } from '@/services/platform-accounts.service';

export const platformAccountsQueryKeys = {
  list: (query: PlatformAccountListQuery) => ['platform-accounts', query] as const,
  detail: (id: string) => ['platform-account', id] as const,
};

export function usePlatformAccounts(query: PlatformAccountListQuery, enabled = true) {
  return useQuery({
    queryKey: platformAccountsQueryKeys.list(query),
    queryFn: ({ signal }) => platformAccountsService.list(query, signal),
    enabled,
  });
}

export function usePlatformAccount(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: platformAccountsQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => platformAccountsService.get(id!, signal),
    enabled: Boolean(id) && enabled,
  });
}
