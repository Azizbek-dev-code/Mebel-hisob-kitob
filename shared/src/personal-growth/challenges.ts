import {
  GrowthChallengeKind,
  GrowthChallengeMetric,
  type GrowthChallengeKind as ChallengeKind,
  type GrowthChallengeMetric as ChallengeMetric,
} from '../constants/enums.js';

/** Soft free-tier cap on concurrent PENDING+ACTIVE challenges per identity. */
export const MAX_ACTIVE_CHALLENGES = 5;

export const MIN_CHALLENGE_DURATION_DAYS = 1;
export const MAX_CHALLENGE_DURATION_DAYS = 30;

export const MIN_GROUP_PARTICIPANTS = 3;
export const MAX_GROUP_PARTICIPANTS = 10;

export const DEFAULT_CHALLENGE_REWARD_XP = 50;

export function isValidChallengeDuration(days: number): boolean {
  return (
    Number.isInteger(days) &&
    days >= MIN_CHALLENGE_DURATION_DAYS &&
    days <= MAX_CHALLENGE_DURATION_DAYS
  );
}

export function requiredParticipantCount(kind: ChallengeKind): {
  min: number;
  max: number;
} {
  if (kind === GrowthChallengeKind.FIGHT) return { min: 2, max: 2 };
  return { min: MIN_GROUP_PARTICIPANTS, max: MAX_GROUP_PARTICIPANTS };
}

/** Invitees exclude the creator. */
export function expectedInviteeCount(kind: ChallengeKind, inviteeCount: number): boolean {
  const { min, max } = requiredParticipantCount(kind);
  const total = inviteeCount + 1;
  return total >= min && total <= max;
}

export function challengeNeedsTarget(kind: ChallengeKind): boolean {
  return kind === GrowthChallengeKind.GROUP;
}

export function isValidTargetValue(
  kind: ChallengeKind,
  metric: ChallengeMetric,
  targetValue: number | null | undefined,
): boolean {
  if (!challengeNeedsTarget(kind)) return targetValue == null || targetValue === undefined;
  if (targetValue == null || !Number.isInteger(targetValue) || targetValue < 1) return false;
  if (metric === GrowthChallengeMetric.FOCUS_MINUTES && targetValue > 100_000) return false;
  if (metric === GrowthChallengeMetric.LEARNING_MINUTES && targetValue > 100_000) return false;
  if (metric === GrowthChallengeMetric.TASKS_COMPLETED && targetValue > 10_000) return false;
  if (metric === GrowthChallengeMetric.XP_GAINED && targetValue > 1_000_000) return false;
  return true;
}

export function pickFightWinner(
  scores: ReadonlyArray<{ identityId: string; score: number }>,
): string | null {
  if (scores.length === 0) return null;
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  if (sorted.length >= 2 && sorted[0]!.score === sorted[1]!.score) return null;
  return sorted[0]!.score > 0 ? sorted[0]!.identityId : null;
}

export function groupTargetReached(
  scores: ReadonlyArray<{ score: number }>,
  targetValue: number | null | undefined,
): boolean {
  if (targetValue == null || targetValue <= 0) return false;
  const total = scores.reduce((sum, row) => sum + Math.max(0, row.score), 0);
  return total >= targetValue;
}

export function addDaysUtc(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
