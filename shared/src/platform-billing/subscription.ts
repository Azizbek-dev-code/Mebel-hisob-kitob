import { SubscriptionStatus } from '../constants/enums.js';

/** Default length of a newly approved store's free trial. */
export const DEFAULT_TRIAL_DAYS = 7;

export function addCalendarDays(from: Date, days: number): Date {
  const next = new Date(from.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export interface SubscriptionDates {
  status: string;
  trialEndsAt?: Date | string | null;
  currentPeriodEnd: Date | string;
}

/**
 * Status the product should honour right now.
 *
 * Stored rows can lag (TRIAL whose end date has passed). Readers must use this
 * rather than the raw column so expiry does not depend on a cron.
 */
export function effectiveSubscriptionStatus(
  sub: SubscriptionDates | null | undefined,
  now = new Date(),
): SubscriptionStatus {
  if (!sub) return SubscriptionStatus.EXPIRED;

  const status = sub.status as SubscriptionStatus;
  if (status === SubscriptionStatus.BLOCKED || status === SubscriptionStatus.CANCELLED) {
    return status;
  }
  if (status === SubscriptionStatus.PENDING_PAYMENT) {
    return SubscriptionStatus.PENDING_PAYMENT;
  }

  if (status === SubscriptionStatus.TRIAL) {
    const end = sub.trialEndsAt ? new Date(sub.trialEndsAt) : new Date(sub.currentPeriodEnd);
    return end.getTime() < now.getTime() ? SubscriptionStatus.EXPIRED : SubscriptionStatus.TRIAL;
  }

  if (status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.PAST_DUE) {
    if (new Date(sub.currentPeriodEnd).getTime() < now.getTime()) {
      return SubscriptionStatus.EXPIRED;
    }
    return status;
  }

  if (status === SubscriptionStatus.EXPIRED) return SubscriptionStatus.EXPIRED;
  return status;
}

export function canWriteWithSubscription(status: string): boolean {
  return (
    status === SubscriptionStatus.TRIAL ||
    status === SubscriptionStatus.ACTIVE ||
    status === SubscriptionStatus.PAST_DUE
  );
}

/**
 * Persist EXPIRED when the stored column still says TRIAL/ACTIVE/PAST_DUE but
 * the period has ended. BLOCKED/CANCELLED stay as written.
 */
export function persistedExpiredStatus(
  stored: string,
  effective: SubscriptionStatus,
): SubscriptionStatus | null {
  if (
    effective === SubscriptionStatus.EXPIRED &&
    stored !== SubscriptionStatus.EXPIRED &&
    stored !== SubscriptionStatus.BLOCKED &&
    stored !== SubscriptionStatus.CANCELLED
  ) {
    return SubscriptionStatus.EXPIRED;
  }
  return null;
}

/**
 * Legacy plans (no PlanFeature rows) keep every module open.
 * Once an admin saves a feature set, only those keys are allowed —
 * including the empty set (nothing enabled).
 */
export function planAllowsFeature(
  featureKeys: readonly string[] | null | undefined,
  key: string,
  restricted?: boolean,
): boolean {
  if (restricted === false) return true;
  if (restricted === true) return (featureKeys ?? []).includes(key);
  if (!featureKeys || featureKeys.length === 0) return true;
  return featureKeys.includes(key);
}

export function isUnlimitedLimit(limit: { unlimited?: boolean; limitValue?: number | null } | null | undefined): boolean {
  if (!limit) return true;
  if (limit.unlimited) return true;
  return limit.limitValue == null;
}

export function isWithinLimit(
  used: number,
  limit: { unlimited?: boolean; limitValue?: number | null } | null | undefined,
): boolean {
  if (isUnlimitedLimit(limit)) return true;
  return used < (limit?.limitValue ?? 0);
}

/** Whole calendar days left until `trialEndsAt` (0 when the day has arrived). */
export function trialDaysRemaining(
  trialEndsAt: Date | string | null | undefined,
  now = new Date(),
): number | null {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - now.getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
