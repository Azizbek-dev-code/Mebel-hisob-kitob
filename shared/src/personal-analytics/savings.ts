/**
 * Savings rate for a period: (income − expense) / income.
 * Null when there is no income — a percentage would be meaningless.
 */
export function savingsRatePercent(incomeSom: number, expenseSom: number): number | null {
  if (!Number.isFinite(incomeSom) || !Number.isFinite(expenseSom) || incomeSom <= 0) {
    return null;
  }
  return Math.round(((incomeSom - expenseSom) / incomeSom) * 100);
}

export function utcYearMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Percent change from an earlier period. Null when there is no baseline. */
export function periodDeltaPercent(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}
