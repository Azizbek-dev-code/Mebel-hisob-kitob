import type { PersonalCategoryKind, PersonalEntryType } from '../constants/enums.js';
import type { IsoDateString, Money } from './api.js';
import type { OnboardingCountBucket } from './onboarding.js';

export interface PersonalAnalyticsTotals {
  incomeSom: Money;
  expenseSom: Money;
  netSom: Money;
  savingsRatePercent: number | null;
}

export interface PersonalAnalyticsCategoryRow {
  categoryId: string;
  name: string;
  kind: PersonalCategoryKind;
  type: PersonalEntryType;
  amountSom: Money;
}

export interface PersonalAnalyticsMonthRow {
  yearMonth: string;
  incomeSom: Money;
  expenseSom: Money;
  netSom: Money;
  savingsRatePercent: number | null;
}

export interface PersonalAnalyticsResponse {
  months: number;
  periodStart: IsoDateString;
  periodEnd: IsoDateString;
  incomeSom: Money;
  expenseSom: Money;
  netSom: Money;
  savingsRatePercent: number | null;
  previous: PersonalAnalyticsTotals;
  byCategory: PersonalAnalyticsCategoryRow[];
  monthly: PersonalAnalyticsMonthRow[];
}

export interface PersonalAnalyticsQuery {
  months?: number;
}

export interface PersonalPlatformStatsResponse {
  workspaces: number;
  trial: number;
  active: number;
  expired: number;
  cancelled: number;
  withEntries: number;
  withBudgets: number;
  withSavingGoals: number;
  onboarding: {
    started: number;
    completed: number;
    discoverySource: OnboardingCountBucket[];
    goals: OnboardingCountBucket[];
    helpWith: OnboardingCountBucket[];
    monthlyIncomeBand: OnboardingCountBucket[];
    customIncomeEnteredCount: number;
  };
}
