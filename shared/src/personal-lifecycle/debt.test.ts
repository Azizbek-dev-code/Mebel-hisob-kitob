import { PersonalDebtStatus } from '../constants/enums.js';
import { describe, expect, it } from 'vitest';

import { personalDebtRemaining, personalDebtStatus } from './debt.js';

const NOW = new Date('2026-09-13T12:00:00.000Z');

describe('personalDebtStatus', () => {
  it('flags overdue when remaining and the due date passed', () => {
    expect(personalDebtStatus(10_000, 0, '2026-09-10T00:00:00.000Z', NOW)).toBe(
      PersonalDebtStatus.OVERDUE,
    );
  });

  it('treats a full repayment as paid even if the due date passed', () => {
    expect(personalDebtStatus(10_000, 10_000, '2026-09-10T00:00:00.000Z', NOW)).toBe(
      PersonalDebtStatus.PAID,
    );
    expect(personalDebtRemaining(10_000, 4_000)).toBe(6_000);
  });

  it('marks a partial payment as partially paid when still on time', () => {
    expect(personalDebtStatus(10_000, 4_000, '2026-09-20T00:00:00.000Z', NOW)).toBe(
      PersonalDebtStatus.PARTIALLY_PAID,
    );
  });
});
