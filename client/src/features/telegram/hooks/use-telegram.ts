import type { TelegramConnectionStatus, UpdateTelegramPrefsRequest } from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { telegramService } from '@/services/telegram.service';

export const telegramKeys = {
  status: ['telegram', 'status'] as const,
};

export function useTelegramStatus() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: telegramKeys.status,
    queryFn: ({ signal }) => telegramService.status(signal),
    enabled: Boolean(user),
    refetchOnWindowFocus: true,
  });
}

export function useTelegramLinkStart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => telegramService.startLink(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: telegramKeys.status });
    },
  });
}

export function useTelegramUnlink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => telegramService.unlink(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: telegramKeys.status });
    },
  });
}

export function useUpdateTelegramPrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTelegramPrefsRequest) => telegramService.updatePrefs(body),
    onSuccess: (data) => {
      queryClient.setQueryData<TelegramConnectionStatus>(telegramKeys.status, data);
    },
  });
}
