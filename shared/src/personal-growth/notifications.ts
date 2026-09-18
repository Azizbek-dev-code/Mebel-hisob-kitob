import { GrowthNotificationKind } from '../constants/enums.js';

export type GrowthNotifyPrefKey =
  | 'notifyReminder'
  | 'notifyAchievement'
  | 'notifyFriend'
  | 'notifyFight'
  | 'notifyStreak'
  | 'notifyResult';

export const GROWTH_NOTIFY_PREF_BY_KIND: Record<
  (typeof GrowthNotificationKind)[keyof typeof GrowthNotificationKind],
  GrowthNotifyPrefKey
> = {
  REMINDER: 'notifyReminder',
  ACHIEVEMENT: 'notifyAchievement',
  FRIEND: 'notifyFriend',
  FIGHT: 'notifyFight',
  STREAK: 'notifyStreak',
  RESULT: 'notifyResult',
};

/** Soft cap — oldest unread beyond this still listed but create is rate-limited elsewhere. */
export const GROWTH_NOTIFICATION_LIST_LIMIT = 50;

export function isGrowthNotifyPrefEnabled(
  prefs: Partial<Record<GrowthNotifyPrefKey, boolean>> | null | undefined,
  kind: (typeof GrowthNotificationKind)[keyof typeof GrowthNotificationKind],
): boolean {
  const key = GROWTH_NOTIFY_PREF_BY_KIND[kind];
  if (!prefs) return true;
  return prefs[key] !== false;
}
