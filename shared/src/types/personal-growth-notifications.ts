import type { GrowthNotificationKind } from '../constants/enums.js';
import type { GrowthNotifyPrefKey } from '../personal-growth/notifications.js';

export interface GrowthNotificationDto {
  id: string;
  kind: GrowthNotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export type GrowthNotificationPrefs = Record<GrowthNotifyPrefKey, boolean>;

export interface GrowthNotificationsListResponse {
  items: GrowthNotificationDto[];
  unreadCount: number;
  prefs: GrowthNotificationPrefs;
}

export interface UpdateGrowthNotificationPrefsRequest {
  notifyReminder?: boolean;
  notifyAchievement?: boolean;
  notifyFriend?: boolean;
  notifyFight?: boolean;
  notifyStreak?: boolean;
  notifyResult?: boolean;
}

export interface MarkGrowthNotificationsRequest {
  /** Empty / omitted = mark all visible unread as read. */
  ids?: string[];
}
