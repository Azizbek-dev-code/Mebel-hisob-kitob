import { describe, expect, it } from 'vitest';

import { budgetProgress, estimateGoalReachAt, projectGoal } from './estimate.js';

describe('projectGoal', () => {
  const now = new Date('2026-09-13T12:00:00.000Z');

  it('returns now when the target is already met', () => {
    expect(
      projectGoal({
        targetSom: 1_000,
        savedSom: 1_000,
        firstContributionAt: '2026-09-01T12:00:00.000Z',
        now,
      }),
    ).toMatchObject({ etaKind: 'MET', estimatedReachAt: now.toISOString(), onTrack: true });
  });

  it('projects from a declared monthly set-aside, not a one-day piggy bank', () => {
    const result = projectGoal({
      targetSom: 10_000,
      savedSom: 2_000,
      monthlyContributionSom: 2_000,
      firstContributionAt: '2026-09-12T12:00:00.000Z',
      now,
    });
    expect(result.etaKind).toBe('MONTHLY');
    expect(result.estimatedReachAt).toBe('2027-01-13T12:00:00.000Z');
  });

  it('does not invent a far-future date from short contribution history', () => {
    expect(
      estimateGoalReachAt({
        targetSom: 150_000_000,
        savedSom: 10_000_000,
        firstContributionAt: '2026-09-12T12:00:00.000Z',
        now,
      }),
    ).toBeNull();
  });

  it('uses target date to compute the required monthly amount', () => {
    const result = projectGoal({
      targetSom: 13_000,
      savedSom: 1_000,
      targetDate: '2027-01-13T12:00:00.000Z',
      now,
    });
    expect(result.etaKind).toBe('TARGET_DATE');
    expect(result.requiredMonthlySom).toBe(3_000);
    expect(result.estimatedReachAt).toBe('2027-01-13T12:00:00.000Z');
  });

  it('marks monthly pace as behind when it misses the target date', () => {
    const result = projectGoal({
      targetSom: 10_000,
      savedSom: 0,
      monthlyContributionSom: 1_000,
      targetDate: '2026-10-13T12:00:00.000Z',
      now,
    });
    expect(result.etaKind).toBe('MONTHLY');
    expect(result.onTrack).toBe(false);
  });

  it('falls back to history only after a month of contributions', () => {
    const result = projectGoal({
      targetSom: 10_000,
      savedSom: 2_000,
      firstContributionAt: '2026-08-04T12:00:00.000Z',
      now,
    });
    expect(result.etaKind).toBe('HISTORY');
    expect(result.estimatedReachAt).toBe('2027-02-20T12:00:00.000Z');
  });
});

describe('budgetProgress', () => {
  it('allows spent to exceed the limit', () => {
    expect(budgetProgress(1_000, 1_250)).toEqual({
      remainingSom: -250,
      percent: 125,
      overspentSom: 250,
      warningLevel: 'OVER',
    });
  });

  it('warns at 80% without treating the cap as spent', () => {
    expect(budgetProgress(1_000, 800).warningLevel).toBe('NEAR');
    expect(budgetProgress(1_000, 799).warningLevel).toBe('NONE');
  });

  it('marks the exact cap as LIMIT and a rounding edge as OVER', () => {
    expect(budgetProgress(1_000, 1_000).warningLevel).toBe('LIMIT');
    expect(budgetProgress(1_000, 1_001)).toMatchObject({ percent: 100, warningLevel: 'OVER', overspentSom: 1 });
  });
});
