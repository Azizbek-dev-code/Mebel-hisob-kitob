import { GlobalCompetitionStatus, GlobalRewardPlace } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  monthBoundsUtc,
  periodKeyFromDate,
} from './personal-growth-competition.service.js';

describe('monthly competition helpers', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('builds deterministic UTC period keys', () => {
    expect(periodKeyFromDate(new Date('2026-09-15T12:00:00.000Z'))).toBe('2026-09');
    expect(periodKeyFromDate(new Date('2026-01-01T00:00:00.000Z'))).toBe('2026-01');
  });

  it('computes exclusive end-of-month bounds', () => {
    const bounds = monthBoundsUtc('2026-09');
    expect(bounds.startsAt.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(bounds.endsAt.toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('exposes reward place enums for admin wiring', () => {
    expect(GlobalRewardPlace.FIRST).toBe('FIRST');
    expect(GlobalCompetitionStatus.ACTIVE).toBe('ACTIVE');
  });
});
