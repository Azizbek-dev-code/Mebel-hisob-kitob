/** Study session anti-cheat (lighter than Pomodoro focus). */
export const LEARNING_MIN_CREDIT_SECONDS = 60;
export const LEARNING_MAX_SESSION_MINUTES = 240;
export const LEARNING_DAILY_CREDIT_CAP_MINUTES = 12 * 60;
export const LEARNING_COMPLETE_GRACE_MINUTES = 5;
export const MAX_ACTIVE_LEARNING_GOALS = 30;
export const MAX_MILESTONES_PER_GOAL = 12;

export type LearningCreditResult = {
  creditedMinutes: number;
  durationSeconds: number;
  discardReason: string | null;
  status: 'COMPLETED' | 'DISCARDED';
};

/**
 * Credit study time from wall-clock. Client may under-report (tab sleep),
 * never over-report past wall clock. Forgotten overnight timers are capped.
 */
export function evaluateLearningCredit(input: {
  plannedMinutes?: number | null;
  startedAt: Date;
  endedAt: Date;
  alreadyCreditedTodayMinutes: number;
  clientReportedSeconds?: number | null;
  /** Quick-log path: trust claimed minutes but still clamp to caps. */
  claimedMinutes?: number | null;
}): LearningCreditResult {
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
    durationSeconds = Math.min(wallSeconds, Math.floor(input.clientReportedSeconds));
  }

  if (input.claimedMinutes != null && Number.isFinite(input.claimedMinutes)) {
    const claimedSeconds = Math.floor(input.claimedMinutes * 60);
    // Quick log: no live timer — treat claim as duration but hard-cap.
    durationSeconds = Math.min(
      claimedSeconds,
      LEARNING_MAX_SESSION_MINUTES * 60,
      wallSeconds > 0 ? wallSeconds : claimedSeconds,
    );
  }

  if (durationSeconds < LEARNING_MIN_CREDIT_SECONDS) {
    return {
      creditedMinutes: 0,
      durationSeconds,
      discardReason: 'TOO_SHORT',
      status: 'DISCARDED',
    };
  }

  const planned = Math.max(
    1,
    Math.min(
      LEARNING_MAX_SESSION_MINUTES,
      Math.floor(input.plannedMinutes ?? LEARNING_MAX_SESSION_MINUTES),
    ),
  );

  let rawMinutes = Math.floor(durationSeconds / 60);
  const suspicious =
    durationSeconds > (planned + LEARNING_COMPLETE_GRACE_MINUTES) * 60 * 3 ||
    durationSeconds > LEARNING_MAX_SESSION_MINUTES * 60;

  rawMinutes = Math.min(
    rawMinutes,
    planned + LEARNING_COMPLETE_GRACE_MINUTES,
    LEARNING_MAX_SESSION_MINUTES,
  );
  if (suspicious) rawMinutes = Math.min(rawMinutes, planned);

  const remaining = Math.max(
    0,
    LEARNING_DAILY_CREDIT_CAP_MINUTES - Math.max(0, input.alreadyCreditedTodayMinutes),
  );
  const creditedMinutes = Math.min(rawMinutes, remaining);

  if (creditedMinutes === 0 && remaining === 0) {
    return {
      creditedMinutes: 0,
      durationSeconds,
      discardReason: 'DAILY_CAP',
      status: 'DISCARDED',
    };
  }

  return {
    creditedMinutes,
    durationSeconds,
    discardReason: suspicious ? 'CAPPED_IDLE_TIMER' : null,
    status: creditedMinutes > 0 ? 'COMPLETED' : 'DISCARDED',
  };
}

/** Progress 0–100 from score/value or study-hours target. */
export function computeLearningProgress(input: {
  targetValue: number;
  currentValue: number;
  totalStudyMinutes: number;
  targetUnit: string;
}): number {
  const target = Math.max(0, input.targetValue);
  if (target <= 0) return 0;
  const unit = input.targetUnit.toLowerCase();
  if (unit === 'hours' || unit === 'hour' || unit === 'soat') {
    const hours = input.totalStudyMinutes / 60;
    return Math.min(100, Math.round((hours / target) * 100));
  }
  if (unit === 'minutes' || unit === 'minute' || unit === 'daq' || unit === 'daqiqua') {
    return Math.min(100, Math.round((input.totalStudyMinutes / target) * 100));
  }
  return Math.min(100, Math.round((Math.max(0, input.currentValue) / target) * 100));
}
