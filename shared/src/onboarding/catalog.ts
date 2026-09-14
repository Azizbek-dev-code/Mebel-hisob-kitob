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

export const PersonalGoal = {
  CONTROL_EXPENSES: 'CONTROL_EXPENSES',
  START_SAVING: 'START_SAVING',
  BUILD_BUDGET: 'BUILD_BUDGET',
  MANAGE_DEBT: 'MANAGE_DEBT',
  TRACK_INCOME: 'TRACK_INCOME',
  IMPROVE_FINANCES: 'IMPROVE_FINANCES',
} as const;
export type PersonalGoal = (typeof PersonalGoal)[keyof typeof PersonalGoal];

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

export const ACCOUNT_PURPOSES = Object.values(AccountPurpose);
export const PERSONAL_GOALS = Object.values(PersonalGoal);
export const DISCOVERY_SOURCES = Object.values(DiscoverySource);
export const MONTHLY_INCOME_BANDS = Object.values(MonthlyIncomeBand);
export const HELP_WITH_OPTIONS = Object.values(HelpWith);
export const FIRST_SAVING_GOALS = Object.values(FirstSavingGoal);

export const OnboardingQuestionKey = {
  PURPOSE: 'purpose',
  GOALS: 'goals',
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
    optionKeys: PERSONAL_GOALS,
  },
  {
    key: OnboardingQuestionKey.DISCOVERY_SOURCE,
    type: 'single',
    optionKeys: DISCOVERY_SOURCES,
  },
  {
    key: OnboardingQuestionKey.MONTHLY_INCOME_BAND,
    type: 'single',
    optionKeys: MONTHLY_INCOME_BANDS,
  },
  {
    key: OnboardingQuestionKey.HELP_WITH,
    type: 'multi',
    optionKeys: HELP_WITH_OPTIONS,
  },
  {
    key: OnboardingQuestionKey.FIRST_SAVING_GOAL,
    type: 'single',
    optionKeys: FIRST_SAVING_GOALS,
  },
] as const;
