import { useQuery } from '@tanstack/react-query';

import { platformShopsService } from '@/services/platform-shops.service';

export const platformShopsQueryKeys = {
  all: ['platform-shops'] as const,
};

export function usePlatformShops(enabled = true) {
  return useQuery({
    queryKey: platformShopsQueryKeys.all,
    queryFn: ({ signal }) => platformShopsService.list(signal),
    enabled,
  });
}
