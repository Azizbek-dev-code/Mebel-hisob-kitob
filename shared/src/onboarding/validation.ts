import { isBusinessType } from '../constants/enums.js';
import {
  ACCOUNT_PURPOSES,
  AccountPurpose,
  DISCOVERY_SOURCES,
  DiscoverySource,
  FIRST_SAVING_GOALS,
  FirstSavingGoal,
  HELP_WITH_OPTIONS,
  MONTHLY_INCOME_BANDS,
  MonthlyIncomeBand,
  PERSONAL_GOALS,
  type OnboardingQuestionCatalogEntry,
} from './catalog.js';

export interface OnboardingAnswers {
  purpose?: AccountPurpose;
  businessType?: string;
  goals?: string[];
  discoverySource?: string;
  discoveryOther?: string;
  monthlyIncomeBand?: string;
  helpWith?: string[];
  /** Optional. Not required to complete personal onboarding. */
  firstSavingGoal?: string;
  firstSavingGoalOther?: string;
  [key: string]: string | string[] | undefined;
}

export interface OnboardingFieldError {
  field: string;
  message: string;
}

function isOneOf(value: string, allowed: readonly string[]): boolean {
  return allowed.includes(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/** Drops unknown keys and never keeps a custom income amount in the JSON blob. */
export function sanitizeOnboardingAnswers(input: unknown): OnboardingAnswers {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const raw = input as Record<string, unknown>;
  const answers: OnboardingAnswers = {};

  if (typeof raw.purpose === 'string' && isOneOf(raw.purpose, ACCOUNT_PURPOSES)) {
    answers.purpose = raw.purpose as AccountPurpose;
  }
  if (typeof raw.businessType === 'string' && isBusinessType(raw.businessType)) {
    answers.businessType = raw.businessType;
  }
  const goals = asStringArray(raw.goals).filter((key) => isOneOf(key, PERSONAL_GOALS));
  if (goals.length > 0) answers.goals = [...new Set(goals)];
  if (typeof raw.discoverySource === 'string' && isOneOf(raw.discoverySource, DISCOVERY_SOURCES)) {
    answers.discoverySource = raw.discoverySource;
  }
  if (typeof raw.discoveryOther === 'string') {
    const other = raw.discoveryOther.trim().slice(0, 200);
    if (other) answers.discoveryOther = other;
  }
  if (
    typeof raw.monthlyIncomeBand === 'string' &&
    isOneOf(raw.monthlyIncomeBand, MONTHLY_INCOME_BANDS)
  ) {
    answers.monthlyIncomeBand = raw.monthlyIncomeBand;
  }
  const helpWith = asStringArray(raw.helpWith).filter((key) => isOneOf(key, HELP_WITH_OPTIONS));
  if (helpWith.length > 0) answers.helpWith = [...new Set(helpWith)];
  if (
    typeof raw.firstSavingGoal === 'string' &&
    isOneOf(raw.firstSavingGoal, FIRST_SAVING_GOALS)
  ) {
    answers.firstSavingGoal = raw.firstSavingGoal;
  }
  if (typeof raw.firstSavingGoalOther === 'string') {
    const other = raw.firstSavingGoalOther.trim().slice(0, 200);
    if (other) answers.firstSavingGoalOther = other;
  }
  if (answers.firstSavingGoal !== FirstSavingGoal.OTHER) {
    delete answers.firstSavingGoalOther;
  }
  return answers;
}

/** Stored JSON is already sanitized on write. Rehydrate extra catalog keys without custom amounts. */
export function readOnboardingAnswers(input: unknown): OnboardingAnswers {
  const answers = sanitizeOnboardingAnswers(input);
  if (!input || typeof input !== 'object' || Array.isArray(input)) return answers;
  const raw = input as Record<string, unknown>;
  for (const [key, value] of Object.entries(raw)) {
    if (key in answers) continue;
    if (/income/i.test(key) && /som/i.test(key)) continue;
    if (typeof value === 'string') {
      const text = value.trim().slice(0, 200);
      if (text) answers[key] = text;
    } else if (Array.isArray(value)) {
      const items = [...new Set(asStringArray(value))].slice(0, 30);
      if (items.length > 0) answers[key] = items;
    }
  }
  return answers;
}

export function mergeOnboardingAnswers(
  current: OnboardingAnswers,
  patch: OnboardingAnswers,
): OnboardingAnswers {
  return { ...current, ...patch };
}

export function validatePersonalOnboardingComplete(
  answers: OnboardingAnswers,
  customMonthlyIncomeSom?: number | null,
): OnboardingFieldError[] {
  const errors: OnboardingFieldError[] = [];
  if (answers.purpose !== AccountPurpose.PERSONAL) {
    errors.push({ field: 'purpose', message: 'Personal Finance yo‘nalishini tanlang' });
  }
  if (!answers.goals?.length) {
    errors.push({ field: 'goals', message: 'Kamida bitta maqsadni tanlang' });
  }
  if (!answers.discoverySource) {
    errors.push({ field: 'discoverySource', message: 'Qayerdan bilganingizni tanlang' });
  }
  if (answers.discoverySource === DiscoverySource.OTHER && !answers.discoveryOther) {
    errors.push({ field: 'discoveryOther', message: 'Qisqacha yozing' });
  }
  if (!answers.monthlyIncomeBand) {
    errors.push({ field: 'monthlyIncomeBand', message: 'Daromad oralig‘ini tanlang' });
  }
  if (answers.monthlyIncomeBand === MonthlyIncomeBand.CUSTOM) {
    if (customMonthlyIncomeSom == null || !Number.isInteger(customMonthlyIncomeSom) || customMonthlyIncomeSom <= 0) {
      errors.push({ field: 'customMonthlyIncomeSom', message: 'Oylik daromadni so‘mda kiriting' });
    }
  }
  if (!answers.helpWith?.length) {
    errors.push({ field: 'helpWith', message: 'Kamida bitta yordam turini tanlang' });
  }
  return errors;
}

export function isCustomIncomeBand(band: string | undefined): boolean {
  return band === MonthlyIncomeBand.CUSTOM;
}

export function questionByKey(
  questions: readonly OnboardingQuestionCatalogEntry[],
  key: string,
): OnboardingQuestionCatalogEntry | undefined {
  return questions.find((question) => question.key === key);
}
