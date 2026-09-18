import { GrowthFocusStatus, type GrowthFocusStatus as FocusStatus } from '../constants/enums.js';

/** Shortest focus block that can earn credit (accidental taps). */
export const FOCUS_MIN_CREDIT_SECONDS = 45;
/** Hard cap per session even if the timer was left running overnight. */
export const FOCUS_MAX_SESSION_MINUTES = 90;
/** Daily credited focus ceiling (anti grind / idle timer). */
export const FOCUS_DAILY_CREDIT_CAP_MINUTES = 8 * 60;
/** Allow a couple of minutes past the plan for “complete” taps. */
export const FOCUS_COMPLETE_GRACE_MINUTES = 2;

export type FocusCreditResult = {
  status: Exclude<FocusStatus, 'RUNNING'>;
  durationSeconds: number;
  creditedMinutes: number;
  discardReason: string | null;
};

/**
 * Server-side anti-cheat: wall-clock wins over client claims.
 * Leaving a 10h timer open does not credit 10h of focus.
 */
export function evaluateFocusCredit(input: {
  plannedMinutes: number;
  startedAt: Date;
  endedAt: Date;
  interrupted: boolean;
  alreadyCreditedTodayMinutes: number;
  clientReportedSeconds?: number | null;
  isBreak?: boolean;
}): FocusCreditResult {
  const planned = Math.max(1, Math.min(FOCUS_MAX_SESSION_MINUTES, Math.floor(input.plannedMinutes)));
  const wallSeconds = Math.max(
    0,
    Math.floor((input.endedAt.getTime() - input.startedAt.getTime()) / 1000),
  );

  let durationSeconds = wallSeconds;
  if (
    input.clientReportedSeconds != null &&
    Number.isFinite(input.clientReportedSeconds) &&
    input.clientReportedSeconds >= 0
  ) {
    // Client may under-report (tab sleep); never allow over-report past wall clock.
    durationSeconds = Math.min(wallSeconds, Math.floor(input.clientReportedSeconds));
  }

  if (durationSeconds < FOCUS_MIN_CREDIT_SECONDS) {
    return {
      status: GrowthFocusStatus.DISCARDED,
      durationSeconds,
      creditedMinutes: 0,
      discardReason: 'TOO_SHORT',
    };
  }

  const elapsedMinutes = Math.floor(durationSeconds / 60);
  // Idle / forgotten timer: if wall time is wildly longer than plan, only credit the plan.
  const suspicious =
    durationSeconds > (planned + FOCUS_COMPLETE_GRACE_MINUTES) * 60 * 3 ||
    durationSeconds > FOCUS_MAX_SESSION_MINUTES * 60;

  let rawCredit = input.interrupted
    ? Math.min(elapsedMinutes, planned)
    : Math.min(elapsedMinutes, planned + FOCUS_COMPLETE_GRACE_MINUTES, FOCUS_MAX_SESSION_MINUTES);

  if (suspicious) {
    rawCredit = Math.min(rawCredit, planned);
  }

  // Breaks do not count as focus time.
  if (input.isBreak) {
    return {
      status: input.interrupted ? GrowthFocusStatus.INTERRUPTED : GrowthFocusStatus.COMPLETED,
      durationSeconds,
      creditedMinutes: 0,
      discardReason: null,
    };
  }

  const remainingDaily = Math.max(
    0,
    FOCUS_DAILY_CREDIT_CAP_MINUTES - Math.max(0, input.alreadyCreditedTodayMinutes),
  );
  const creditedMinutes = Math.min(rawCredit, remainingDaily);

  if (creditedMinutes === 0 && remainingDaily === 0) {
    return {
      status: GrowthFocusStatus.DISCARDED,
      durationSeconds,
      creditedMinutes: 0,
      discardReason: 'DAILY_CAP',
    };
  }

  return {
    status: input.interrupted ? GrowthFocusStatus.INTERRUPTED : GrowthFocusStatus.COMPLETED,
    durationSeconds,
    creditedMinutes,
    discardReason: suspicious ? 'CAPPED_IDLE_TIMER' : null,
  };
}

export function formatFocusMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
