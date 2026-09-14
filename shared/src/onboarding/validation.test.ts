import { describe, expect, it } from 'vitest';

import { AccountPurpose, MonthlyIncomeBand } from './catalog.js';
import {
  readOnboardingAnswers,
  sanitizeOnboardingAnswers,
  validatePersonalOnboardingComplete,
} from './validation.js';

describe('sanitizeOnboardingAnswers', () => {
  it('drops unknown keys and never keeps a custom income amount', () => {
    const answers = sanitizeOnboardingAnswers({
      purpose: 'PERSONAL',
      goals: ['CONTROL_EXPENSES', 'nope'],
      customMonthlyIncomeSom: 2_500_000,
      monthlyIncomeCustom: 99,
      extra: true,
    });
    expect(answers).toEqual({
      purpose: AccountPurpose.PERSONAL,
      goals: ['CONTROL_EXPENSES'],
    });
    expect(JSON.stringify(answers)).not.toContain('2500000');
  });

  it('keeps an optional first saving goal and drops unknown keys', () => {
    expect(
      sanitizeOnboardingAnswers({
        firstSavingGoal: 'CAR',
        firstSavingGoalOther: 'ignored unless OTHER',
        storeName: 'Fayz Mebel',
      }),
    ).toEqual({ firstSavingGoal: 'CAR' });
  });

  it('keeps OTHER first-goal free text and never store fields', () => {
    expect(
      sanitizeOnboardingAnswers({
        firstSavingGoal: 'OTHER',
        firstSavingGoalOther: '  Noutbuk  ',
        warehouse: 'A',
      }),
    ).toEqual({ firstSavingGoal: 'OTHER', firstSavingGoalOther: 'Noutbuk' });
  });
});

describe('readOnboardingAnswers', () => {
  it('rehydrates business catalog keys without custom amounts', () => {
    expect(
      readOnboardingAnswers({
        purpose: 'BUSINESS',
        businessType: 'FURNITURE',
        businessSize: 'SOLO',
        customMonthlyIncomeSom: 2500000,
      }),
    ).toEqual({
      purpose: AccountPurpose.BUSINESS,
      businessType: 'FURNITURE',
      businessSize: 'SOLO',
    });
  });
});

describe('validatePersonalOnboardingComplete', () => {
  const complete = {
    purpose: AccountPurpose.PERSONAL,
    goals: ['CONTROL_EXPENSES'],
    discoverySource: 'INSTAGRAM',
    monthlyIncomeBand: MonthlyIncomeBand.UNDER_1M,
    helpWith: ['TRACK_EXPENSES'],
  };

  it('accepts a complete personal flow', () => {
    expect(validatePersonalOnboardingComplete(complete)).toEqual([]);
  });

  it('requires a custom amount only when the band is CUSTOM', () => {
    const errors = validatePersonalOnboardingComplete({
      ...complete,
      monthlyIncomeBand: MonthlyIncomeBand.CUSTOM,
    });
    expect(errors.some((error) => error.field === 'customMonthlyIncomeSom')).toBe(true);
    expect(
      validatePersonalOnboardingComplete(
        { ...complete, monthlyIncomeBand: MonthlyIncomeBand.CUSTOM },
        3_000_000,
      ),
    ).toEqual([]);
  });
});
