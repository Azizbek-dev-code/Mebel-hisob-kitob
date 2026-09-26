import { formatCountBadge, isPersonalAuth, UserRole, type MarkBusinessNotificationsReadRequest, type UpdateBusinessNotificationPrefsRequest } from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { businessNotificationsService } from '@/services/business-notifications.service';

export const businessNotificationKeys = {
  all: ['business-notifications'] as const,
};

export function useBusinessNotifications() {
  const { data: user } = useCurrentUser();
  const enabled = Boolean(user && !isPersonalAuth(user) && user.role !== UserRole.PLATFORM_ADMIN);
  return useQuery({
    queryKey: businessNotificationKeys.all,
    queryFn: ({ signal }) => businessNotificationsService.list(signal),
    enabled,
  });
}

export function useBusinessUnreadCount() {
  const { data: user } = useCurrentUser();
  const enabled = Boolean(user && !isPersonalAuth(user) && user.role !== UserRole.PLATFORM_ADMIN);
  const query = useQuery({
    queryKey: businessNotificationKeys.all,
    queryFn: ({ signal }) => businessNotificationsService.list(signal),
    enabled,
    select: (data) => data.unreadCount,
  });
  const count = query.data ?? 0;
  return { count, badge: formatCountBadge(count), isPending: query.isPending };
}

export function useUpdateBusinessNotificationPrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateBusinessNotificationPrefsRequest) =>
      businessNotificationsService.updatePrefs(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessNotificationKeys.all });
    },
  });
}

export function useMarkBusinessNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MarkBusinessNotificationsReadRequest = {}) =>
      businessNotificationsService.markRead(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessNotificationKeys.all });
    },
  });
}
