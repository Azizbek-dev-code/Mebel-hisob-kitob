import { BudgetWarningLevel, GoalEtaKind } from '../constants/enums.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Warn once spend reaches 80% of the monthly limit. */
export const BUDGET_NEAR_RATIO = 0.8;

/** Average daily pace is only a fallback after a full month of contributions. */
export const GOAL_HISTORY_MIN_DAYS = 30;

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function utcMonthSpan(from: Date, to: Date): number {
  return (
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth()) +
    (to.getUTCDate() - from.getUTCDate()) / 30
  );
}

function addUtcMonths(from: Date, months: number): Date {
  const whole = Math.trunc(months);
  const frac = months - whole;
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth() + whole;
  const day = from.getUTCDate();
  const dim = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const base = new Date(
    Date.UTC(
      year,
      month,
      Math.min(day, dim),
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds(),
    ),
  );
  return new Date(base.getTime() + frac * 30 * MS_PER_DAY);
}

export interface GoalProjectionInput {
  targetSom: number;
  savedSom: number;
  monthlyContributionSom?: number | null;
  targetDate?: string | Date | null;
  firstContributionAt?: string | Date | null;
  now?: Date;
}

export interface GoalProjection {
  estimatedReachAt: string | null;
  requiredMonthlySom: number | null;
  etaKind: GoalEtaKind | null;
  onTrack: boolean | null;
}

function requiredMonthlyForDate(remainingSom: number, now: Date, targetDate: Date): number {
  const span = utcMonthSpan(now, targetDate);
  if (span <= 1 / 30) return remainingSom;
  return Math.ceil(remainingSom / span);
}

/**
 * Project when a savings goal is reached.
 *
 * Order: already met → declared monthly set-aside → target date (required
 * monthly) → contribution history after 30 days. Short history must not
 * extrapolate a 2067-style date from one piggy-bank deposit.
 */
export function projectGoal(input: GoalProjectionInput): GoalProjection {
  const now = input.now ?? new Date();
  const empty: GoalProjection = {
    estimatedReachAt: null,
    requiredMonthlySom: null,
    etaKind: null,
    onTrack: null,
  };
  if (!Number.isFinite(input.targetSom) || input.targetSom <= 0) return empty;
  if (input.savedSom >= input.targetSom) {
    return {
      estimatedReachAt: now.toISOString(),
      requiredMonthlySom: 0,
      etaKind: GoalEtaKind.MET,
      onTrack: true,
    };
  }

  const remainingSom = input.targetSom - input.savedSom;
  const targetDate = parseDate(input.targetDate ?? null);
  const requiredMonthlySom = targetDate ? requiredMonthlyForDate(remainingSom, now, targetDate) : null;
  const monthly =
    input.monthlyContributionSom != null && input.monthlyContributionSom > 0
      ? input.monthlyContributionSom
      : null;

  if (monthly) {
    const estimatedReachAt = addUtcMonths(now, remainingSom / monthly);
    const onTrack = targetDate ? estimatedReachAt.getTime() <= targetDate.getTime() : null;
    return {
      estimatedReachAt: estimatedReachAt.toISOString(),
      requiredMonthlySom,
      etaKind: GoalEtaKind.MONTHLY,
      onTrack,
    };
  }

  if (targetDate) {
    const future = targetDate.getTime() >= now.getTime();
    return {
      estimatedReachAt: future ? targetDate.toISOString() : null,
      requiredMonthlySom,
      etaKind: GoalEtaKind.TARGET_DATE,
      onTrack: future ? null : false,
    };
  }

  const first = parseDate(input.firstContributionAt ?? null);
  if (first && input.savedSom > 0) {
    const elapsedDays = Math.max((now.getTime() - first.getTime()) / MS_PER_DAY, 1);
    if (elapsedDays >= GOAL_HISTORY_MIN_DAYS) {
      const avgPerDay = input.savedSom / elapsedDays;
      if (avgPerDay > 0) {
        const estimatedReachAt = new Date(now.getTime() + (remainingSom / avgPerDay) * MS_PER_DAY);
        return {
          estimatedReachAt: estimatedReachAt.toISOString(),
          requiredMonthlySom,
          etaKind: GoalEtaKind.HISTORY,
          onTrack: null,
        };
      }
    }
  }

  return empty;
}

export function estimateGoalReachAt(input: GoalProjectionInput): string | null {
  return projectGoal(input).estimatedReachAt;
}

/**
 * Month-to-date spend against a personal budget. Transfers are not spend —
 * callers must pass ACTIVE expense only. Warning uses the unrounded ratio so
 * 1001 / 1000 is OVER even if percent rounds to 100.
 */
export function budgetProgress(limitSom: number, spentSom: number) {
  const remainingSom = limitSom - spentSom;
  const percent = limitSom <= 0 ? 0 : Math.round((spentSom / limitSom) * 100);
  const overspentSom = Math.max(0, spentSom - limitSom);
  let warningLevel: BudgetWarningLevel = BudgetWarningLevel.NONE;
  if (limitSom > 0) {
    if (spentSom > limitSom) warningLevel = BudgetWarningLevel.OVER;
    else if (spentSom >= limitSom) warningLevel = BudgetWarningLevel.LIMIT;
    else if (spentSom / limitSom >= BUDGET_NEAR_RATIO) warningLevel = BudgetWarningLevel.NEAR;
  }
  return { remainingSom, percent, overspentSom, warningLevel };
}
