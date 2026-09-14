import { describe, expect, it } from 'vitest';

import { SubscriptionStatus } from '../constants/enums.js';

import { PlanChangeDecision, canRequestPaidPlan, evaluatePaidPlanChange } from './plan-change.js';

const START = { currentPlanId: 'start', currentRank: 1, targetPlanId: 'pro', targetRank: 2, targetIsTrial: false };
const PRO = { currentPlanId: 'pro', currentRank: 2, targetPlanId: 'biz', targetRank: 3, targetIsTrial: false };
const BUSINESS = {
  currentPlanId: 'biz',
  currentRank: 3,
  targetPlanId: 'pro',
  targetRank: 2,
  targetIsTrial: false,
};

describe('evaluatePaidPlanChange', () => {
  it('lets a trial account request any paid plan', () => {
    expect(
      evaluatePaidPlanChange({
        effectiveStatus: SubscriptionStatus.TRIAL,
        currentPlanId: 'trial',
        currentRank: 0,
        targetPlanId: 'start',
        targetRank: 1,
        targetIsTrial: false,
      }),
    ).toBe(PlanChangeDecision.ALLOWED);
  });

  it('allows START → PRO and PRO → BUSINESS', () => {
    expect(evaluatePaidPlanChange({ ...START, effectiveStatus: SubscriptionStatus.ACTIVE })).toBe(
      PlanChangeDecision.ALLOWED,
    );
    expect(evaluatePaidPlanChange({ ...PRO, effectiveStatus: SubscriptionStatus.ACTIVE })).toBe(
      PlanChangeDecision.ALLOWED,
    );
  });

  it('rejects a lower plan and the current plan while active', () => {
    expect(evaluatePaidPlanChange({ ...BUSINESS, effectiveStatus: SubscriptionStatus.ACTIVE })).toBe(
      PlanChangeDecision.DOWNGRADE,
    );
    expect(
      evaluatePaidPlanChange({
        effectiveStatus: SubscriptionStatus.ACTIVE,
        currentPlanId: 'biz',
        currentRank: 3,
        targetPlanId: 'biz',
        targetRank: 3,
        targetIsTrial: false,
      }),
    ).toBe(PlanChangeDecision.SAME_PLAN);
  });

  it('blocks requesting the trial tariff', () => {
    expect(
      evaluatePaidPlanChange({
        effectiveStatus: SubscriptionStatus.ACTIVE,
        currentPlanId: 'start',
        currentRank: 1,
        targetPlanId: 'trial',
        targetRank: 0,
        targetIsTrial: true,
      }),
    ).toBe(PlanChangeDecision.TRIAL_NOT_REQUESTABLE);
  });

  it('lets an expired account pick any paid plan, including a lower one', () => {
    expect(evaluatePaidPlanChange({ ...BUSINESS, effectiveStatus: SubscriptionStatus.EXPIRED })).toBe(
      PlanChangeDecision.ALLOWED,
    );
    expect(
      canRequestPaidPlan({
        effectiveStatus: SubscriptionStatus.EXPIRED,
        currentPlanId: 'biz',
        currentRank: 3,
        targetPlanId: 'start',
        targetRank: 1,
        targetIsTrial: false,
      }),
    ).toBe(true);
  });

  it('does not let a blocked account self-serve a plan', () => {
    expect(evaluatePaidPlanChange({ ...START, effectiveStatus: SubscriptionStatus.BLOCKED })).toBe(
      PlanChangeDecision.BLOCKED,
    );
  });
});
