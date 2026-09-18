import type {
  MarkGrowthNotificationsRequest,
  UpdateGrowthNotificationPrefsRequest,
} from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalGrowthNotificationsService } from '@/services/personal-growth-notifications.service';

export const personalGrowthNotificationsKeys = {
  all: ['personal', 'growth', 'notifications'] as const,
  list: () => [...personalGrowthNotificationsKeys.all, 'list'] as const,
};

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: personalGrowthNotificationsKeys.all });
}

export function useGrowthNotifications() {
  return useQuery({
    queryKey: personalGrowthNotificationsKeys.list(),
    queryFn: ({ signal }) => personalGrowthNotificationsService.list(signal),
  });
}

export function useMarkGrowthNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body?: MarkGrowthNotificationsRequest) =>
      personalGrowthNotificationsService.markRead(body ?? {}),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDismissGrowthNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => personalGrowthNotificationsService.dismiss(id),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateGrowthNotificationPrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateGrowthNotificationPrefsRequest) =>
      personalGrowthNotificationsService.updatePrefs(body),
    onSuccess: () => invalidate(queryClient),
  });
}
