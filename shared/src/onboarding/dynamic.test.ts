import { describe, expect, it } from 'vitest';

import { AccountPurpose } from './catalog.js';
import {
  sanitizeOnboardingAnswersWithCatalog,
  scopeOnboardingAnswers,
  validateOnboardingComplete,
  type CatalogQuestionForSanitize,
} from './dynamic.js';

const CATALOG: CatalogQuestionForSanitize[] = [
  {
    key: 'goals',
    audience: 'PERSONAL',
    answerType: 'MULTI',
    required: true,
    optionKeys: ['CONTROL_EXPENSES', 'START_SAVING'],
    allowsOtherKeys: [],
  },
  {
    key: 'firstSavingGoal',
    audience: 'PERSONAL',
    answerType: 'SINGLE',
    required: false,
    optionKeys: ['PHONE', 'OTHER'],
    allowsOtherKeys: ['OTHER'],
  },
  {
    key: 'businessSize',
    audience: 'BUSINESS',
    answerType: 'SINGLE',
    required: true,
    optionKeys: ['SOLO', 'SMALL'],
    allowsOtherKeys: [],
  },
];

describe('dynamic onboarding answers', () => {
  it('keeps catalog keys and drops unknown ERP fields', () => {
    const answers = sanitizeOnboardingAnswersWithCatalog(
      {
        purpose: AccountPurpose.PERSONAL,
        goals: ['CONTROL_EXPENSES', 'nope'],
        storeName: 'Fayz',
        customMonthlyIncomeSom: 9_999,
      },
      CATALOG,
    );
    expect(answers.goals).toEqual(['CONTROL_EXPENSES']);
    expect(JSON.stringify(answers)).not.toContain('Fayz');
    expect(JSON.stringify(answers)).not.toContain('9999');
  });

  it('does not mix personal answers into a business submission', () => {
    const scoped = scopeOnboardingAnswers(
      {
        purpose: AccountPurpose.BUSINESS,
        businessType: 'FURNITURE',
        goals: ['CONTROL_EXPENSES'],
        businessSize: 'SOLO',
      },
      CATALOG,
    );
    expect(scoped.goals).toBeUndefined();
    expect(scoped.businessSize).toBe('SOLO');
  });

  it('blocks skip of a required question on complete', () => {
    const errors = validateOnboardingComplete(
      { purpose: AccountPurpose.PERSONAL },
      CATALOG,
    );
    expect(errors.some((error) => error.field === 'goals')).toBe(true);
    expect(
      validateOnboardingComplete(
        { purpose: AccountPurpose.PERSONAL, goals: ['CONTROL_EXPENSES'] },
        CATALOG,
      ),
    ).toEqual([]);
  });

  it('allows skipping an optional question', () => {
    expect(
      validateOnboardingComplete(
        { purpose: AccountPurpose.PERSONAL, goals: ['START_SAVING'] },
        CATALOG,
      ),
    ).toEqual([]);
  });
});
