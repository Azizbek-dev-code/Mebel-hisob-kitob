import { SubscriptionStatus } from '../constants/enums.js';

import { canWriteWithSubscription } from './subscription.js';

export const PlanChangeDecision = {
  ALLOWED: 'ALLOWED',
  SAME_PLAN: 'SAME_PLAN',
  DOWNGRADE: 'DOWNGRADE',
  TRIAL_NOT_REQUESTABLE: 'TRIAL_NOT_REQUESTABLE',
  BLOCKED: 'BLOCKED',
} as const;
export type PlanChangeDecision = (typeof PlanChangeDecision)[keyof typeof PlanChangeDecision];

export const PLAN_CHANGE_MESSAGES: Record<Exclude<PlanChangeDecision, 'ALLOWED'>, string> = {
  SAME_PLAN: 'Bu tarif allaqachon joriy',
  DOWNGRADE: 'Pastroq tarifga o‘tish so‘rovini yuborib bo‘lmaydi',
  TRIAL_NOT_REQUESTABLE: 'Sinov tarifiga obuna bo‘lib bo‘lmaydi',
  BLOCKED: 'Bu hisob uchun tarif so‘rash mumkin emas',
};

export interface EvaluatePaidPlanChangeInput {
  effectiveStatus: SubscriptionStatus;
  currentPlanId: string;
  currentRank: number;
  targetPlanId: string;
  targetRank: number;
  targetIsTrial: boolean;
}

/**
 * Upgrade-only while TRIAL/ACTIVE. Expired (and pending-payment) accounts may
 * pick any paid plan, including the one they just left. Lower plans are never
 * requestable on a live subscription — frontend hiding is not the control.
 */
export function evaluatePaidPlanChange(input: EvaluatePaidPlanChangeInput): PlanChangeDecision {
  if (input.targetIsTrial) return PlanChangeDecision.TRIAL_NOT_REQUESTABLE;

  if (
    input.effectiveStatus === SubscriptionStatus.BLOCKED ||
    input.effectiveStatus === SubscriptionStatus.CANCELLED
  ) {
    return PlanChangeDecision.BLOCKED;
  }

  const expiredLike =
    input.effectiveStatus === SubscriptionStatus.EXPIRED ||
    input.effectiveStatus === SubscriptionStatus.PENDING_PAYMENT;

  if (expiredLike) return PlanChangeDecision.ALLOWED;

  if (input.currentPlanId === input.targetPlanId && canWriteWithSubscription(input.effectiveStatus)) {
    return PlanChangeDecision.SAME_PLAN;
  }

  if (canWriteWithSubscription(input.effectiveStatus) && input.targetRank <= input.currentRank) {
    return PlanChangeDecision.DOWNGRADE;
  }

  return PlanChangeDecision.ALLOWED;
}

export function canRequestPaidPlan(input: EvaluatePaidPlanChangeInput): boolean {
  return evaluatePaidPlanChange(input) === PlanChangeDecision.ALLOWED;
}
