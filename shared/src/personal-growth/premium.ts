import { PERSONAL_PLAN_KEY } from '../personal-billing/catalog.js';
import { SubscriptionStatus } from '../constants/enums.js';
import { MAX_ACTIVE_CHALLENGES } from './challenges.js';
import { MAX_ACTIVE_HABITS } from './habits.js';
import { MAX_ACTIVE_LEARNING_GOALS } from './learning.js';

/** Soft Free vs Paid (Premium) growth usage — not ERP FeatureKey. */
export type GrowthPlanTier = 'FREE' | 'PREMIUM';

export type GrowthQuotaKey =
  | 'activeLearningGoals'
  | 'activeHabits'
  | 'activeChallenges'
  | 'acceptedFriends';

/** Free / trial: real value, soft caps — never aggressive paywall. */
export const GROWTH_FREE_QUOTAS: Readonly<Record<GrowthQuotaKey, number>> = {
  activeLearningGoals: 5,
  activeHabits: 8,
  activeChallenges: 2,
  acceptedFriends: 20,
};

/**
 * Paid premium: higher caps (still hard safety ceilings from module MAX_*).
 * AI Coach / advanced customization remain extension points.
 */
export const GROWTH_PREMIUM_QUOTAS: Readonly<Record<GrowthQuotaKey, number>> = {
  activeLearningGoals: MAX_ACTIVE_LEARNING_GOALS,
  activeHabits: MAX_ACTIVE_HABITS,
  activeChallenges: Math.max(MAX_ACTIVE_CHALLENGES, 10),
  acceptedFriends: 200,
};

export type GrowthQuotaSnapshot = {
  tier: GrowthPlanTier;
  quotas: Record<GrowthQuotaKey, number>;
  usage: Record<GrowthQuotaKey, number>;
  /** True when any free quota is at/over limit. */
  nearLimit: boolean;
  premium: boolean;
};

/**
 * Premium = paid personal plan with writable subscription.
 * Trial stays on Free quotas so upgrade after value is felt.
 */
export function resolveGrowthTier(input: {
  planKey: string | null | undefined;
  status: string | null | undefined;
  canWrite?: boolean;
}): GrowthPlanTier {
  if (input.canWrite === false) return 'FREE';
  const status = input.status ?? '';
  const writable =
    status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.PAST_DUE;
  if (input.planKey === PERSONAL_PLAN_KEY.PAID && writable) {
    return 'PREMIUM';
  }
  return 'FREE';
}

export function growthQuotaFor(tier: GrowthPlanTier, key: GrowthQuotaKey): number {
  return tier === 'PREMIUM' ? GROWTH_PREMIUM_QUOTAS[key] : GROWTH_FREE_QUOTAS[key];
}

export function isGrowthQuotaExceeded(
  tier: GrowthPlanTier,
  key: GrowthQuotaKey,
  used: number,
): boolean {
  return used >= growthQuotaFor(tier, key);
}

export function buildGrowthQuotaSnapshot(input: {
  tier: GrowthPlanTier;
  usage: Record<GrowthQuotaKey, number>;
}): GrowthQuotaSnapshot {
  const quotas = {
    activeLearningGoals: growthQuotaFor(input.tier, 'activeLearningGoals'),
    activeHabits: growthQuotaFor(input.tier, 'activeHabits'),
    activeChallenges: growthQuotaFor(input.tier, 'activeChallenges'),
    acceptedFriends: growthQuotaFor(input.tier, 'acceptedFriends'),
  };
  const nearLimit = (Object.keys(quotas) as GrowthQuotaKey[]).some(
    (key) => input.usage[key] >= quotas[key],
  );
  return {
    tier: input.tier,
    quotas,
    usage: input.usage,
    nearLimit,
    premium: input.tier === 'PREMIUM',
  };
}
