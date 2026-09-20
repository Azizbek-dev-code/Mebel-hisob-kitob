import { describe, expect, it } from 'vitest';

import {
  computeLearningProgress,
  evaluateLearningCredit,
  LEARNING_MAX_SESSION_MINUTES,
} from './learning.js';

describe('evaluateLearningCredit', () => {
  it('credits claimed minutes within caps', () => {
    const startedAt = new Date('2026-09-17T10:00:00.000Z');
    const endedAt = new Date('2026-09-17T10:00:00.000Z');
    const result = evaluateLearningCredit({
      startedAt,
      endedAt,
      claimedMinutes: 45,
      alreadyCreditedTodayMinutes: 0,
    });
    expect(result.creditedMinutes).toBe(45);
    expect(result.status).toBe('COMPLETED');
  });

  it('rejects tiny sessions', () => {
    const startedAt = new Date('2026-09-17T10:00:00.000Z');
    const endedAt = new Date('2026-09-17T10:00:30.000Z');
    const result = evaluateLearningCredit({
      startedAt,
      endedAt,
      claimedMinutes: 0.4,
      alreadyCreditedTodayMinutes: 0,
    });
    expect(result.status).toBe('DISCARDED');
    expect(result.discardReason).toBe('TOO_SHORT');
  });

  it('caps forgotten overnight timers', () => {
    const startedAt = new Date('2026-09-17T10:00:00.000Z');
    const endedAt = new Date('2026-09-18T10:00:00.000Z');
    const result = evaluateLearningCredit({
      startedAt,
      endedAt,
      plannedMinutes: 60,
      alreadyCreditedTodayMinutes: 0,
    });
    expect(result.creditedMinutes).toBeLessThanOrEqual(LEARNING_MAX_SESSION_MINUTES);
    expect(result.creditedMinutes).toBe(60);
  });
});

describe('computeLearningProgress', () => {
  it('uses score ratio by default', () => {
    expect(
      computeLearningProgress({
        targetValue: 7,
        currentValue: 3.5,
        totalStudyMinutes: 0,
        targetUnit: 'score',
      }),
    ).toBe(50);
  });

  it('uses study hours when unit is hours', () => {
    expect(
      computeLearningProgress({
        targetValue: 10,
        currentValue: 0,
        totalStudyMinutes: 300,
        targetUnit: 'hours',
      }),
    ).toBe(50);
  });

  it('uses study minutes when unit is minutes', () => {
    expect(
      computeLearningProgress({
        targetValue: 60,
        currentValue: 0,
        totalStudyMinutes: 45,
        targetUnit: 'minutes',
      }),
    ).toBe(75);
  });
});
