import { formatCountBadge } from '@furniture-erp/shared';

import { useGrowthNotifications } from '@/features/personal/growth/hooks/use-growth-notifications';
import { usePersonalNotifications } from '@/features/personal/lifecycle/hooks/use-personal-lifecycle';

export function useUnreadNotificationCount() {
  const finance = usePersonalNotifications();
  const growth = useGrowthNotifications();
  const count = (finance.data?.unreadCount ?? 0) + (growth.data?.unreadCount ?? 0);
  return { count, badge: formatCountBadge(count) };
}
