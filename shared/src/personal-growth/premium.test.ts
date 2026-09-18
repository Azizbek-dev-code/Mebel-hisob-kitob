import { describe, expect, it } from 'vitest';

import { PERSONAL_PLAN_KEY } from '../personal-billing/catalog.js';
import { SubscriptionStatus } from '../constants/enums.js';
import {
  GROWTH_FREE_QUOTAS,
  GROWTH_PREMIUM_QUOTAS,
  buildGrowthQuotaSnapshot,
  growthQuotaFor,
  isGrowthQuotaExceeded,
  resolveGrowthTier,
} from './premium.js';

describe('resolveGrowthTier', () => {
  it('keeps trial on FREE so upgrade stays meaningful', () => {
    expect(
      resolveGrowthTier({
        planKey: PERSONAL_PLAN_KEY.TRIAL,
        status: SubscriptionStatus.TRIAL,
        canWrite: true,
      }),
    ).toBe('FREE');
  });

  it('marks paid ACTIVE as PREMIUM', () => {
    expect(
      resolveGrowthTier({
        planKey: PERSONAL_PLAN_KEY.PAID,
        status: SubscriptionStatus.ACTIVE,
        canWrite: true,
      }),
    ).toBe('PREMIUM');
  });

  it('does not grant premium when write is closed', () => {
    expect(
      resolveGrowthTier({
        planKey: PERSONAL_PLAN_KEY.PAID,
        status: SubscriptionStatus.EXPIRED,
        canWrite: false,
      }),
    ).toBe('FREE');
  });
});

describe('growth quotas', () => {
  it('free caps are below premium', () => {
    expect(GROWTH_FREE_QUOTAS.activeLearningGoals).toBeLessThan(
      GROWTH_PREMIUM_QUOTAS.activeLearningGoals,
    );
    expect(GROWTH_FREE_QUOTAS.activeChallenges).toBeLessThan(
      GROWTH_PREMIUM_QUOTAS.activeChallenges,
    );
  });

  it('detects exceeded free learning goals', () => {
    expect(isGrowthQuotaExceeded('FREE', 'activeLearningGoals', 5)).toBe(true);
    expect(isGrowthQuotaExceeded('FREE', 'activeLearningGoals', 4)).toBe(false);
    expect(growthQuotaFor('PREMIUM', 'activeLearningGoals')).toBe(
      GROWTH_PREMIUM_QUOTAS.activeLearningGoals,
    );
  });

  it('builds snapshot nearLimit flag', () => {
    const snap = buildGrowthQuotaSnapshot({
      tier: 'FREE',
      usage: {
        activeLearningGoals: 5,
        activeHabits: 0,
        activeChallenges: 0,
        acceptedFriends: 0,
      },
    });
    expect(snap.premium).toBe(false);
    expect(snap.nearLimit).toBe(true);
    expect(snap.quotas.activeLearningGoals).toBe(5);
  });
});
