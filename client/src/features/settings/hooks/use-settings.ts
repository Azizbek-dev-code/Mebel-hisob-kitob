import {
  isPersonalAuth,
  type AuthPrincipal,
  type ResetStoreRequest,
  type UpdateStoreProfileRequest,
} from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authQueryKeys } from '@/features/auth/hooks/use-auth';
import { settingsService } from '@/services/settings.service';

export const settingsKeys = {
  all: ['settings'] as const,
  store: () => [...settingsKeys.all, 'store'] as const,
};

export function useStoreSettings(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.store(),
    queryFn: ({ signal }) => settingsService.getStore(signal),
    enabled,
  });
}

export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateStoreProfileRequest) => settingsService.updateStore(body),
    onSuccess: (store) => {
      queryClient.setQueryData(settingsKeys.store(), store);

      queryClient.setQueryData<AuthPrincipal | null>(authQueryKeys.currentUser, (prev) => {
        if (!prev || isPersonalAuth(prev) || prev.storeId !== store.id || prev.storeName === store.name) {
          return prev;
        }
        return { ...prev, storeName: store.name };
      });
    },
  });
}

export function useResetStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ResetStoreRequest) => settingsService.resetStore(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
  });
}
