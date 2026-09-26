import { formatCountBadge } from '@furniture-erp/shared';
import { useQuery } from '@tanstack/react-query';

import {
  personalGrowthNotificationsKeys,
} from '@/features/personal/growth/hooks/use-growth-notifications';
import { personalLifecycleKeys } from '@/features/personal/lifecycle/hooks/use-personal-lifecycle';
import { personalGrowthNotificationsService } from '@/services/personal-growth-notifications.service';
import { personalLifecycleService } from '@/services/personal-lifecycle.service';

/** Badge-only unread counts — selects unreadCount to avoid retaining full list payloads. */
export function useUnreadNotificationCount() {
  const finance = useQuery({
    queryKey: personalLifecycleKeys.notifications,
    queryFn: ({ signal }) => personalLifecycleService.notifications(signal),
    select: (data) => data.unreadCount,
  });
  const growth = useQuery({
    queryKey: personalGrowthNotificationsKeys.list(),
    queryFn: ({ signal }) => personalGrowthNotificationsService.list(signal),
    select: (data) => data.unreadCount,
  });
  const count = (finance.data ?? 0) + (growth.data ?? 0);
  return { count, badge: formatCountBadge(count) };
}
