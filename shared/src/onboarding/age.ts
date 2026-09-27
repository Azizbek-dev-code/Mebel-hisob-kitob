/**
 * Age + Personal registration draft helpers.
 * Age is product personalization only — never used for discrimination or gating.
 */

import { PERSONAL_AGE_MAX, PERSONAL_AGE_MIN } from './catalog.js';
import type { OnboardingFieldError } from './validation.js';

export function parsePersonalAge(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.trim());
    if (Number.isInteger(n)) return n;
  }
  return null;
}

export function validatePersonalAge(value: unknown): OnboardingFieldError[] {
  const age = parsePersonalAge(value);
  if (age == null) {
    return [{ field: 'age', message: 'Yoshingizni kiriting' }];
  }
  if (age < PERSONAL_AGE_MIN || age > PERSONAL_AGE_MAX) {
    return [
      {
        field: 'age',
        message: `Yosh ${PERSONAL_AGE_MIN}–${PERSONAL_AGE_MAX} oralig‘ida bo‘lishi kerak`,
      },
    ];
  }
  return [];
}

export function ageToAnswerString(age: number): string {
  return String(age);
}

/** Non-secret draft keys persisted in onboarding answers for refresh recovery. */
export const PERSONAL_DRAFT_ANSWER_KEYS = ['firstName', 'lastName', 'age'] as const;
export type PersonalDraftAnswerKey = (typeof PERSONAL_DRAFT_ANSWER_KEYS)[number];

export function readDraftPersonName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, 80);
  return trimmed || undefined;
}
