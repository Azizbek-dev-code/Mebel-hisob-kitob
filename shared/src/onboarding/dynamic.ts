import { isBusinessType } from '../constants/enums.js';

import { AccountPurpose, MonthlyIncomeBand } from './catalog.js';
import {
  sanitizeOnboardingAnswers,
  type OnboardingAnswers,
  type OnboardingFieldError,
  validatePersonalOnboardingComplete,
} from './validation.js';

export interface CatalogQuestionForSanitize {
  key: string;
  audience: 'PERSONAL' | 'BUSINESS';
  businessType?: string | null;
  answerType: 'SINGLE' | 'MULTI' | 'TEXT';
  required: boolean;
  optionKeys: readonly string[];
  allowsOtherKeys: readonly string[];
}

export function otherTextKey(questionKey: string): string {
  return `${questionKey}Other`;
}

function isOneOf(value: string, allowed: readonly string[]): boolean {
  return allowed.includes(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function readText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, 200);
  return trimmed || undefined;
}

/** Drops unknown keys. Never keeps a custom income amount in the JSON blob. */
export function sanitizeOnboardingAnswersWithCatalog(
  input: unknown,
  catalog: readonly CatalogQuestionForSanitize[],
): OnboardingAnswers {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const raw = input as Record<string, unknown>;
  const answers: OnboardingAnswers = {};

  if (typeof raw.purpose === 'string' && isOneOf(raw.purpose, [AccountPurpose.PERSONAL, AccountPurpose.BUSINESS])) {
    answers.purpose = raw.purpose as AccountPurpose;
  }
  if (typeof raw.businessType === 'string' && isBusinessType(raw.businessType)) {
    answers.businessType = raw.businessType;
  }

  for (const question of catalog) {
    const value = raw[question.key];
    if (question.answerType === 'MULTI') {
      const selected = [...new Set(asStringArray(value).filter((key) => isOneOf(key, question.optionKeys)))];
      if (selected.length > 0) answers[question.key] = selected;
    } else if (question.answerType === 'TEXT') {
      const text = readText(value);
      if (text) answers[question.key] = text;
    } else if (typeof value === 'string' && isOneOf(value, question.optionKeys)) {
      answers[question.key] = value;
    }

    const other = readText(raw[otherTextKey(question.key)]);
    const selected = answers[question.key];
    const selectedKeys = Array.isArray(selected) ? selected : selected ? [selected] : [];
    const wantsOther = selectedKeys.some((key) => question.allowsOtherKeys.includes(key));
    if (other && wantsOther) answers[otherTextKey(question.key)] = other;
  }

  // Legacy free-text aliases used by v1 personal submissions.
  if (typeof raw.discoveryOther === 'string' && answers.discoverySource === 'OTHER') {
    const other = readText(raw.discoveryOther);
    if (other) answers.discoveryOther = other;
  }
  if (typeof raw.firstSavingGoalOther === 'string' && answers.firstSavingGoal === 'OTHER') {
    const other = readText(raw.firstSavingGoalOther);
    if (other) answers.firstSavingGoalOther = other;
  }

  return answers;
}

export function scopeOnboardingAnswers(
  answers: OnboardingAnswers,
  catalog: readonly CatalogQuestionForSanitize[],
): OnboardingAnswers {
  const purpose = answers.purpose;
  if (purpose !== AccountPurpose.PERSONAL && purpose !== AccountPurpose.BUSINESS) {
    return { purpose: answers.purpose, businessType: answers.businessType };
  }

  const allowed = catalog.filter((question) => {
    if (question.audience !== purpose) return false;
    if (purpose === AccountPurpose.BUSINESS && question.businessType) {
      return question.businessType === answers.businessType;
    }
    return true;
  });
  const allowedKeys = new Set(allowed.map((question) => question.key));
  const scoped: OnboardingAnswers = { purpose };
  if (purpose === AccountPurpose.BUSINESS && answers.businessType) {
    scoped.businessType = answers.businessType;
  }

  for (const question of allowed) {
    if (answers[question.key] !== undefined) scoped[question.key] = answers[question.key];
    const otherKey = otherTextKey(question.key);
    if (answers[otherKey] !== undefined) scoped[otherKey] = answers[otherKey];
  }

  if (purpose === AccountPurpose.PERSONAL) {
    if (answers.discoveryOther && allowedKeys.has('discoverySource')) {
      scoped.discoveryOther = answers.discoveryOther;
    }
    if (answers.firstSavingGoalOther && allowedKeys.has('firstSavingGoal')) {
      scoped.firstSavingGoalOther = answers.firstSavingGoalOther;
    }
  }

  return scoped;
}

export function validateOnboardingComplete(
  answers: OnboardingAnswers,
  catalog: readonly CatalogQuestionForSanitize[],
  customMonthlyIncomeSom?: number | null,
): OnboardingFieldError[] {
  if (catalog.length === 0) {
    if (answers.purpose === AccountPurpose.BUSINESS) {
      const errors: OnboardingFieldError[] = [];
      if (!answers.businessType || !isBusinessType(answers.businessType)) {
        errors.push({ field: 'businessType', message: 'Biznes turini tanlang' });
      }
      return errors;
    }
    return validatePersonalOnboardingComplete(answers, customMonthlyIncomeSom);
  }

  const errors: OnboardingFieldError[] = [];
  if (answers.purpose !== AccountPurpose.PERSONAL && answers.purpose !== AccountPurpose.BUSINESS) {
    errors.push({ field: 'purpose', message: 'Yo‘nalishni tanlang' });
    return errors;
  }

  const relevant = catalog.filter((question) => {
    if (question.audience !== answers.purpose) return false;
    if (answers.purpose === AccountPurpose.BUSINESS && question.businessType) {
      return question.businessType === answers.businessType;
    }
    return true;
  });

  if (answers.purpose === AccountPurpose.BUSINESS && !answers.businessType) {
    errors.push({ field: 'businessType', message: 'Biznes turini tanlang' });
  }

  for (const question of relevant) {
    if (!question.required) continue;
    const value = answers[question.key];
    if (question.answerType === 'MULTI') {
      if (!Array.isArray(value) || value.length === 0) {
        errors.push({ field: question.key, message: 'Kamida bitta variantni tanlang' });
      }
    } else if (!value || (typeof value === 'string' && !value.trim())) {
      errors.push({ field: question.key, message: 'Javobni tanlang' });
    } else {
      const selected = Array.isArray(value) ? value : [value];
      const needsOther = selected.some((key) => question.allowsOtherKeys.includes(key));
      const other =
        readText(answers[otherTextKey(question.key)]) ??
        (question.key === 'discoverySource' ? readText(answers.discoveryOther) : undefined) ??
        (question.key === 'firstSavingGoal' ? readText(answers.firstSavingGoalOther) : undefined);
      if (needsOther && !other) {
        errors.push({ field: otherTextKey(question.key), message: 'Qisqacha yozing' });
      }
    }
  }

  if (answers.monthlyIncomeBand === MonthlyIncomeBand.CUSTOM) {
    if (
      customMonthlyIncomeSom == null ||
      !Number.isInteger(customMonthlyIncomeSom) ||
      customMonthlyIncomeSom <= 0
    ) {
      errors.push({ field: 'customMonthlyIncomeSom', message: 'Oylik daromadni so‘mda kiriting' });
    }
  }

  return errors;
}

export function sanitizeAnswersForPersistence(
  input: unknown,
  catalog: readonly CatalogQuestionForSanitize[],
): OnboardingAnswers {
  const sanitized =
    catalog.length > 0
      ? sanitizeOnboardingAnswersWithCatalog(input, catalog)
      : sanitizeOnboardingAnswers(input);
  return catalog.length > 0 ? scopeOnboardingAnswers(sanitized, catalog) : sanitized;
}
