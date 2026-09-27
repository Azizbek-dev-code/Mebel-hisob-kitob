/**
 * Versioned onboarding question catalogue.
 *
 * New questions / A/B variants bump `ONBOARDING_FLOW_VERSION` or set
 * `experimentKey` on a submission. Stored answers keep the version they were
 * captured with, so old rows stay readable after the catalogue moves on.
 */

export const ONBOARDING_FLOW_KEY = 'workspace_onboarding';
/** Keep v1 so existing submissions stay in the same admin stats cohort. New keys are additive. */
export const ONBOARDING_FLOW_VERSION = 1;

export const AccountPurpose = {
  PERSONAL: 'PERSONAL',
  BUSINESS: 'BUSINESS',
} as const;
export type AccountPurpose = (typeof AccountPurpose)[keyof typeof AccountPurpose];

/** Personal registration goal options (multi-select). Legacy keys remain readable. */
export const PersonalGoal = {
  CONTROL_MONEY: 'CONTROL_MONEY',
  CUT_SPENDING: 'CUT_SPENDING',
  BUILD_BUDGET: 'BUILD_BUDGET',
  SAVE_GOAL: 'SAVE_GOAL',
  MANAGE_DEBT: 'MANAGE_DEBT',
  MANAGE_INCOME: 'MANAGE_INCOME',
  ALL_IN_ONE: 'ALL_IN_ONE',
  /** @deprecated Legacy v1 keys — still accepted when reading old submissions. */
  CONTROL_EXPENSES: 'CONTROL_EXPENSES',
  START_SAVING: 'START_SAVING',
  TRACK_INCOME: 'TRACK_INCOME',
  IMPROVE_FINANCES: 'IMPROVE_FINANCES',
} as const;
export type PersonalGoal = (typeof PersonalGoal)[keyof typeof PersonalGoal];

/** Active Personal registration goal keys (shown in UI / seeded catalog). */
export const PERSONAL_GOALS_V2 = [
  PersonalGoal.CONTROL_MONEY,
  PersonalGoal.CUT_SPENDING,
  PersonalGoal.BUILD_BUDGET,
  PersonalGoal.SAVE_GOAL,
  PersonalGoal.MANAGE_DEBT,
  PersonalGoal.MANAGE_INCOME,
  PersonalGoal.ALL_IN_ONE,
] as const;

export const DiscoverySource = {
  INSTAGRAM: 'INSTAGRAM',
  TELEGRAM: 'TELEGRAM',
  YOUTUBE: 'YOUTUBE',
  GOOGLE: 'GOOGLE',
  FRIEND: 'FRIEND',
  OTHER: 'OTHER',
} as const;
export type DiscoverySource = (typeof DiscoverySource)[keyof typeof DiscoverySource];

export const MonthlyIncomeBand = {
  UNDER_1M: 'UNDER_1M',
  FROM_1_TO_3M: 'FROM_1_TO_3M',
  FROM_3_TO_5M: 'FROM_3_TO_5M',
  FROM_5_TO_10M: 'FROM_5_TO_10M',
  OVER_10M: 'OVER_10M',
  PREFER_NOT: 'PREFER_NOT',
  CUSTOM: 'CUSTOM',
} as const;
export type MonthlyIncomeBand = (typeof MonthlyIncomeBand)[keyof typeof MonthlyIncomeBand];

export const HelpWith = {
  TRACK_EXPENSES: 'TRACK_EXPENSES',
  BUDGET: 'BUDGET',
  SAVE_FOR_GOAL: 'SAVE_FOR_GOAL',
  ANALYTICS: 'ANALYTICS',
  TRACK_DEBT: 'TRACK_DEBT',
  MANAGE_INCOME: 'MANAGE_INCOME',
} as const;
export type HelpWith = (typeof HelpWith)[keyof typeof HelpWith];

/** Optional first savings target. Not a store / SKU / warehouse field. */
export const FirstSavingGoal = {
  PHONE: 'PHONE',
  CAR: 'CAR',
  HOUSE: 'HOUSE',
  TRAVEL: 'TRAVEL',
  SAVINGS: 'SAVINGS',
  OTHER: 'OTHER',
} as const;
export type FirstSavingGoal = (typeof FirstSavingGoal)[keyof typeof FirstSavingGoal];

/** Growth / lifestyle interests for Personal registration personalization. */
export const GrowthInterest = {
  READING_COURSES: 'READING_COURSES',
  IELTS_LANGUAGE: 'IELTS_LANGUAGE',
  PROGRAMMING_SKILL: 'PROGRAMMING_SKILL',
  DAILY_TASKS: 'DAILY_TASKS',
  HABITS: 'HABITS',
  FOCUS_POMODORO: 'FOCUS_POMODORO',
  GOALS: 'GOALS',
  FINANCE_ONLY: 'FINANCE_ONLY',
} as const;
export type GrowthInterest = (typeof GrowthInterest)[keyof typeof GrowthInterest];

export const BiggestProblem = {
  DONT_KNOW_WHERE_MONEY_GOES: 'DONT_KNOW_WHERE_MONEY_GOES',
  CANT_HOLD_BUDGET: 'CANT_HOLD_BUDGET',
  HARD_TO_SAVE: 'HARD_TO_SAVE',
  CANT_MANAGE_TIME: 'CANT_MANAGE_TIME',
  HARD_TO_FOLLOW_PLANS: 'HARD_TO_FOLLOW_PLANS',
  TOO_MANY_APPS: 'TOO_MANY_APPS',
  WANT_ONE_PLACE: 'WANT_ONE_PLACE',
  /** @deprecated Legacy v1 */
  NO_TRACKING: 'NO_TRACKING',
  OVERSPENDING: 'OVERSPENDING',
  NO_SAVINGS: 'NO_SAVINGS',
  DEBT: 'DEBT',
  NO_BUDGET: 'NO_BUDGET',
  OTHER: 'OTHER',
} as const;
export type BiggestProblem = (typeof BiggestProblem)[keyof typeof BiggestProblem];

export const BIGGEST_PROBLEMS_V2 = [
  BiggestProblem.DONT_KNOW_WHERE_MONEY_GOES,
  BiggestProblem.CANT_HOLD_BUDGET,
  BiggestProblem.HARD_TO_SAVE,
  BiggestProblem.CANT_MANAGE_TIME,
  BiggestProblem.HARD_TO_FOLLOW_PLANS,
  BiggestProblem.TOO_MANY_APPS,
  BiggestProblem.WANT_ONE_PLACE,
] as const;

export const GROWTH_INTERESTS = Object.values(GrowthInterest);

export const ACCOUNT_PURPOSES = Object.values(AccountPurpose);
/** All goal keys accepted when reading answers (v2 + legacy). */
export const PERSONAL_GOALS = Object.values(PersonalGoal);
export const DISCOVERY_SOURCES = Object.values(DiscoverySource);
export const MONTHLY_INCOME_BANDS = Object.values(MonthlyIncomeBand);
export const HELP_WITH_OPTIONS = Object.values(HelpWith);
export const FIRST_SAVING_GOALS = Object.values(FirstSavingGoal);
export const BIGGEST_PROBLEMS = Object.values(BiggestProblem);

/** Personal catalog questions deactivated by registration v2 sync (kept for history). */
export const PERSONAL_CATALOG_DEPRECATED_KEYS = [
  'discoverySource',
  'monthlyIncomeBand',
  'helpWith',
  'firstSavingGoal',
] as const;

export const OnboardingQuestionKey = {
  PURPOSE: 'purpose',
  GOALS: 'goals',
  GROWTH_INTERESTS: 'growthInterests',
  BIGGEST_PROBLEM: 'biggestProblem',
  DISCOVERY_SOURCE: 'discoverySource',
  MONTHLY_INCOME_BAND: 'monthlyIncomeBand',
  HELP_WITH: 'helpWith',
  FIRST_SAVING_GOAL: 'firstSavingGoal',
} as const;
export type OnboardingQuestionKey =
  (typeof OnboardingQuestionKey)[keyof typeof OnboardingQuestionKey];

export type OnboardingQuestionType = 'single' | 'multi';

export interface OnboardingQuestionCatalogEntry {
  key: OnboardingQuestionKey;
  type: OnboardingQuestionType;
  optionKeys: readonly string[];
}

export const ONBOARDING_QUESTIONS: readonly OnboardingQuestionCatalogEntry[] = [
  {
    key: OnboardingQuestionKey.PURPOSE,
    type: 'single',
    optionKeys: ACCOUNT_PURPOSES,
  },
  {
    key: OnboardingQuestionKey.GOALS,
    type: 'multi',
    optionKeys: PERSONAL_GOALS_V2,
  },
  {
    key: OnboardingQuestionKey.GROWTH_INTERESTS,
    type: 'multi',
    optionKeys: GROWTH_INTERESTS,
  },
  {
    key: OnboardingQuestionKey.BIGGEST_PROBLEM,
    type: 'single',
    optionKeys: BIGGEST_PROBLEMS_V2,
  },
] as const;

/** Age bounds for Personal registration (product personalization only). */
export const PERSONAL_AGE_MIN = 13;
export const PERSONAL_AGE_MAX = 120;
