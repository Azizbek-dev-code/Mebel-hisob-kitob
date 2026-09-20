import { PresenceVisibility, type PresenceVisibility as Visibility } from '../constants/enums.js';

export const DEFAULT_PRESENCE_OFFLINE_AFTER_SECONDS = 300;
export const DEFAULT_PRESENCE_HEARTBEAT_SECONDS = 45;

export function isOnlineAt(
  lastActivityAt: Date | string | null | undefined,
  now: Date,
  offlineAfterSeconds = DEFAULT_PRESENCE_OFFLINE_AFTER_SECONDS,
): boolean {
  if (!lastActivityAt) return false;
  const at = typeof lastActivityAt === 'string' ? new Date(lastActivityAt) : lastActivityAt;
  if (Number.isNaN(at.getTime())) return false;
  return now.getTime() - at.getTime() <= offlineAfterSeconds * 1000;
}

/**
 * Backend + UI gate. Self always sees their own status.
 * `NOBODY` hides both online state and last seen from everyone else.
 */
export function canSeePresence(input: {
  visibility: Visibility | null | undefined;
  viewerIsSelf: boolean;
  viewerIsFriend: boolean;
}): boolean {
  if (input.viewerIsSelf) return true;
  const visibility = input.visibility ?? PresenceVisibility.FRIENDS;
  if (visibility === PresenceVisibility.NOBODY) return false;
  if (visibility === PresenceVisibility.EVERYONE) return true;
  return input.viewerIsFriend;
}
