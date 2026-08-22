import { describe, expect, it } from 'vitest';

import { SubscriptionStatus } from '../constants/enums.js';

import {
  addCalendarDays,
  canWriteWithSubscription,
  effectiveSubscriptionStatus,
  isUnlimitedLimit,
  isWithinLimit,
  planAllowsFeature,
  trialDaysRemaining,
} from './subscription.js';

describe('effectiveSubscriptionStatus', () => {
  const now = new Date('2026-08-22T12:00:00.000Z');

  it('treats a missing subscription as expired', () => {
    expect(effectiveSubscriptionStatus(null, now)).toBe(SubscriptionStatus.EXPIRED);
  });

  it('keeps an unexpired trial writable', () => {
    expect(
      effectiveSubscriptionStatus(
        {
          status: SubscriptionStatus.TRIAL,
          trialEndsAt: '2026-08-29T12:00:00.000Z',
          currentPeriodEnd: '2026-08-29T12:00:00.000Z',
        },
        now,
      ),
    ).toBe(SubscriptionStatus.TRIAL);
    expect(canWriteWithSubscription(SubscriptionStatus.TRIAL)).toBe(true);
  });

  it('expires a trial whose end date has passed', () => {
    expect(
      effectiveSubscriptionStatus(
        {
          status: SubscriptionStatus.TRIAL,
          trialEndsAt: '2026-08-21T12:00:00.000Z',
          currentPeriodEnd: '2026-08-21T12:00:00.000Z',
        },
        now,
      ),
    ).toBe(SubscriptionStatus.EXPIRED);
    expect(canWriteWithSubscription(SubscriptionStatus.EXPIRED)).toBe(false);
  });

  it('expires an active period that has ended', () => {
    expect(
      effectiveSubscriptionStatus(
        {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: '2026-08-01T00:00:00.000Z',
        },
        now,
      ),
    ).toBe(SubscriptionStatus.EXPIRED);
  });

  it('does not rewrite a pending payment request', () => {
    expect(
      effectiveSubscriptionStatus(
        {
          status: SubscriptionStatus.PENDING_PAYMENT,
          currentPeriodEnd: '2026-08-01T00:00:00.000Z',
        },
        now,
      ),
    ).toBe(SubscriptionStatus.PENDING_PAYMENT);
  });

  it('keeps a manual block distinct from expiry', () => {
    expect(
      effectiveSubscriptionStatus(
        {
          status: SubscriptionStatus.BLOCKED,
          currentPeriodEnd: '2026-09-01T00:00:00.000Z',
        },
        now,
      ),
    ).toBe(SubscriptionStatus.BLOCKED);
  });
});

describe('trialDaysRemaining', () => {
  it('rounds up remaining calendar days', () => {
    expect(trialDaysRemaining('2026-08-24T12:00:00.000Z', new Date('2026-08-22T12:00:00.000Z'))).toBe(
      2,
    );
  });

  it('returns 0 when the trial has ended', () => {
    expect(trialDaysRemaining('2026-08-21T00:00:00.000Z', new Date('2026-08-22T00:00:00.000Z'))).toBe(
      0,
    );
  });
});

describe('addCalendarDays', () => {
  it('adds whole calendar days', () => {
    const start = new Date('2026-08-22T00:00:00.000Z');
    expect(addCalendarDays(start, 7).toISOString()).toBe('2026-08-29T00:00:00.000Z');
  });
});

describe('planAllowsFeature', () => {
  it('allows every feature when the plan has no explicit keys (legacy)', () => {
    expect(planAllowsFeature([], 'sales')).toBe(true);
    expect(planAllowsFeature(null, 'backup')).toBe(true);
  });

  it('blocks a feature the plan did not enable', () => {
    expect(planAllowsFeature(['sales', 'customers'], 'backup')).toBe(false);
    expect(planAllowsFeature(['sales', 'customers'], 'sales')).toBe(true);
  });

  it('blocks every feature when the plan is restricted with an empty set', () => {
    expect(planAllowsFeature([], 'sales', true)).toBe(false);
    expect(planAllowsFeature(['sales'], 'backup', true)).toBe(false);
  });
});

describe('isWithinLimit', () => {
  it('allows any count when unlimited', () => {
    expect(isWithinLimit(999, { unlimited: true, limitValue: null })).toBe(true);
    expect(isUnlimitedLimit({ unlimited: true })).toBe(true);
  });

  it('blocks the next create once the cap is reached', () => {
    expect(isWithinLimit(10, { unlimited: false, limitValue: 10 })).toBe(false);
    expect(isWithinLimit(9, { unlimited: false, limitValue: 10 })).toBe(true);
  });
});
