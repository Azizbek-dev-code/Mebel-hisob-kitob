import { PersonalRecurringDueState, PersonalRecurringFrequency } from '../constants/enums.js';
import { describe, expect, it } from 'vitest';

import { advanceRecurringDue, recurringDueState } from './recurring.js';

const NOW = new Date('2026-09-13T12:00:00.000Z');

describe('advanceRecurringDue', () => {
  it('moves monthly rent to the next 1st without posting a payment', () => {
    const next = advanceRecurringDue({
      frequency: PersonalRecurringFrequency.MONTHLY,
      dayOfMonth: 1,
      from: new Date('2026-09-01T00:00:00.000Z'),
    });
    expect(next.toISOString().slice(0, 10)).toBe('2026-10-01');
  });

  it('clamps month-end days', () => {
    const next = advanceRecurringDue({
      frequency: PersonalRecurringFrequency.MONTHLY,
      dayOfMonth: 31,
      from: new Date('2026-01-31T00:00:00.000Z'),
    });
    expect(next.toISOString().slice(0, 10)).toBe('2026-02-28');
  });

  it('uses custom interval days', () => {
    const next = advanceRecurringDue({
      frequency: PersonalRecurringFrequency.CUSTOM,
      intervalDays: 14,
      from: new Date('2026-09-13T00:00:00.000Z'),
    });
    expect(next.toISOString().slice(0, 10)).toBe('2026-09-27');
  });
});

describe('recurringDueState', () => {
  it('marks yesterday overdue and a date inside 30 days as due', () => {
    expect(recurringDueState(new Date('2026-09-12T00:00:00.000Z'), NOW)).toBe(
      PersonalRecurringDueState.OVERDUE,
    );
    expect(recurringDueState(new Date('2026-10-05T00:00:00.000Z'), NOW)).toBe(
      PersonalRecurringDueState.DUE,
    );
    expect(recurringDueState(new Date('2026-11-01T00:00:00.000Z'), NOW)).toBe(
      PersonalRecurringDueState.LATER,
    );
  });
});
