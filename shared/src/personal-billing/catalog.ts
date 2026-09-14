import { DEFAULT_TRIAL_DAYS } from '../platform-billing/subscription.js';

/**
 * Personal tariff catalogue. Independent of store `SubscriptionPlan` /
 * `isDefaultTrial` — those remain a global singleton for shop ERP trials.
 */
export const PERSONAL_PLAN_KEY = {
  TRIAL: 'PERSONAL_TRIAL',
  PAID: 'PERSONAL_PAID',
} as const;
export type PersonalPlanKey = (typeof PERSONAL_PLAN_KEY)[keyof typeof PERSONAL_PLAN_KEY];

export const PERSONAL_TRIAL_DAYS = DEFAULT_TRIAL_DAYS;
export const PERSONAL_PAID_PERIOD_DAYS = 30;
/** Display price in whole so'm. Paid access is requested, then admin-accepted. */
export const PERSONAL_PAID_MONTHLY_PRICE_SOM = 49_000;

export interface PersonalPlanCatalogEntry {
  key: PersonalPlanKey;
  trialDays: number;
  periodDays: number;
  monthlyPriceSom: number;
  rank: number;
}

export const PERSONAL_PLANS: readonly PersonalPlanCatalogEntry[] = [
  {
    key: PERSONAL_PLAN_KEY.TRIAL,
    trialDays: PERSONAL_TRIAL_DAYS,
    periodDays: PERSONAL_TRIAL_DAYS,
    monthlyPriceSom: 0,
    rank: 0,
  },
  {
    key: PERSONAL_PLAN_KEY.PAID,
    trialDays: 0,
    periodDays: PERSONAL_PAID_PERIOD_DAYS,
    monthlyPriceSom: PERSONAL_PAID_MONTHLY_PRICE_SOM,
    rank: 1,
  },
];

export function personalPlanByKey(key: string): PersonalPlanCatalogEntry | undefined {
  return PERSONAL_PLANS.find((plan) => plan.key === key);
}

export function isPersonalPlanKey(value: string): value is PersonalPlanKey {
  return value === PERSONAL_PLAN_KEY.TRIAL || value === PERSONAL_PLAN_KEY.PAID;
}
