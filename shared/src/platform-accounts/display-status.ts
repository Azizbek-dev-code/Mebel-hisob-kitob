import {
  PlatformAccountDisplayStatus,
  StoreAccessStatus,
  SubscriptionStatus,
  WorkspaceStatus,
  type PlatformAccountSource,
} from '../constants/enums.js';
import { effectiveSubscriptionStatus, type SubscriptionDates } from '../platform-billing/subscription.js';

export interface PlatformAccountStatusInput {
  source: PlatformAccountSource;
  workspaceStatus?: (typeof WorkspaceStatus)[keyof typeof WorkspaceStatus] | null;
  accessStatus?: StoreAccessStatus | null;
  subscription?: SubscriptionDates | null;
}

/**
 * Maps live workspace / store / subscription fields onto the admin table status.
 * Does not write a new database enum.
 */
export function platformAccountDisplayStatus(
  input: PlatformAccountStatusInput,
  now = new Date(),
): PlatformAccountDisplayStatus {
  if (input.source === 'PENDING_REQUEST') {
    return PlatformAccountDisplayStatus.PENDING;
  }
  if (input.workspaceStatus === WorkspaceStatus.ARCHIVED) {
    return PlatformAccountDisplayStatus.CANCELLED;
  }
  if (
    input.accessStatus === StoreAccessStatus.PAYMENT_BLOCKED ||
    input.accessStatus === StoreAccessStatus.MANUALLY_BLOCKED
  ) {
    return PlatformAccountDisplayStatus.BLOCKED;
  }

  const effective = input.subscription
    ? effectiveSubscriptionStatus(input.subscription, now)
    : null;

  if (effective === SubscriptionStatus.BLOCKED || effective === SubscriptionStatus.PENDING_PAYMENT) {
    return PlatformAccountDisplayStatus.BLOCKED;
  }
  if (effective === SubscriptionStatus.CANCELLED) {
    return PlatformAccountDisplayStatus.CANCELLED;
  }
  if (effective === SubscriptionStatus.EXPIRED) {
    return PlatformAccountDisplayStatus.EXPIRED;
  }
  if (effective === SubscriptionStatus.TRIAL) {
    return PlatformAccountDisplayStatus.TRIAL;
  }
  return PlatformAccountDisplayStatus.ACTIVE;
}
