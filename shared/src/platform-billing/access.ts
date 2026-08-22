import { UserRole, StoreAccessStatus } from '../constants/enums.js';

/**
 * Login/session lock. Only a manual admin block turns the store away at the door.
 * Expired trials stay signed in so owners can still read their data and pick a plan.
 */
export function isStoreAccessRestricted(user: {
  role: string;
  storeAccessStatus?: string | null;
}): boolean {
  if (user.role === UserRole.PLATFORM_ADMIN) return false;
  return user.storeAccessStatus === StoreAccessStatus.MANUALLY_BLOCKED;
}
