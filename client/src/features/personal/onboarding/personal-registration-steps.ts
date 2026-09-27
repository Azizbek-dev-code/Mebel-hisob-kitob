import type { OnboardingAnswers, OnboardingSubmissionDto } from '@furniture-erp/shared';

/** Guest Personal registration wizard steps (in order). */
export const PERSONAL_REG_STEPS = [
  'name',
  'age',
  'email',
  'verify',
  'password',
  'questions',
  'value',
  'creating',
] as const;

export type PersonalRegStep = (typeof PERSONAL_REG_STEPS)[number];

/** Catalog question keys shown in the questions step (order fixed). */
export const PERSONAL_QUESTION_KEYS = ['goals', 'growthInterests', 'biggestProblem'] as const;

export type PersonalQuestionKey = (typeof PERSONAL_QUESTION_KEYS)[number];

/** Steps skipped when the user already has a signed-in Identity. */
export const PERSONAL_GUEST_ONLY_STEPS: readonly PersonalRegStep[] = [
  'email',
  'verify',
  'password',
];

export const CREATING_CHECKLIST = [
  { id: 'profile', labelUz: 'Profil', labelRu: 'Профиль' },
  { id: 'email', labelUz: 'Email', labelRu: 'Email' },
  { id: 'account', labelUz: 'Akkaunt', labelRu: 'Аккаунт' },
  { id: 'finance', labelUz: 'Moliyaviy makon', labelRu: 'Финансовое пространство' },
  { id: 'growth', labelUz: "O‘sish", labelRu: 'Рост' },
] as const;

export function personalStepsFor(isSignedIn: boolean): PersonalRegStep[] {
  if (!isSignedIn) return [...PERSONAL_REG_STEPS];
  return PERSONAL_REG_STEPS.filter((step) => !PERSONAL_GUEST_ONLY_STEPS.includes(step));
}

export function stepProgress(
  step: PersonalRegStep,
  isSignedIn: boolean,
): { current: number; total: number } {
  const steps = personalStepsFor(isSignedIn).filter((item) => item !== 'creating');
  const index = steps.indexOf(step === 'creating' ? 'value' : step);
  return {
    current: Math.max(1, index + 1),
    total: steps.length,
  };
}

function hasName(answers: OnboardingAnswers): boolean {
  return Boolean(
    typeof answers.firstName === 'string' &&
      answers.firstName.trim() &&
      typeof answers.lastName === 'string' &&
      answers.lastName.trim(),
  );
}

function hasAge(answers: OnboardingAnswers): boolean {
  return Boolean(answers.age);
}

function firstUnansweredQuestionIndex(answers: OnboardingAnswers): number {
  const index = PERSONAL_QUESTION_KEYS.findIndex((key) => {
    const value = answers[key];
    if (Array.isArray(value)) return value.length === 0;
    return !value;
  });
  return index >= 0 ? index : PERSONAL_QUESTION_KEYS.length;
}

/**
 * Best-effort resume after refresh. Password is never persisted, so guests
 * who verified email land on password again before questions/value.
 */
export function inferPersonalStep(input: {
  answers: OnboardingAnswers;
  submission?: Pick<OnboardingSubmissionDto, 'registerEmail' | 'emailVerifiedAt'> | null;
  isSignedIn: boolean;
}): { step: PersonalRegStep; questionIndex: number } {
  const { answers, submission, isSignedIn } = input;

  if (!hasName(answers)) return { step: 'name', questionIndex: 0 };
  if (!hasAge(answers)) return { step: 'age', questionIndex: 0 };

  if (!isSignedIn) {
    if (!submission?.registerEmail) return { step: 'email', questionIndex: 0 };
    if (!submission.emailVerifiedAt) return { step: 'verify', questionIndex: 0 };
  }

  const qIndex = firstUnansweredQuestionIndex(answers);
  if (qIndex < PERSONAL_QUESTION_KEYS.length) {
    if (!isSignedIn) return { step: 'password', questionIndex: 0 };
    return { step: 'questions', questionIndex: qIndex };
  }

  if (!isSignedIn) return { step: 'password', questionIndex: 0 };
  return { step: 'value', questionIndex: 0 };
}
