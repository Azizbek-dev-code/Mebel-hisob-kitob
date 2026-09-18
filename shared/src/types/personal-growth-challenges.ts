import type {
  GrowthChallengeKind,
  GrowthChallengeMetric,
  GrowthChallengeParticipantStatus,
  GrowthChallengeStatus,
} from '../constants/enums.js';

export interface GrowthChallengeParticipantDto {
  identityId: string;
  fullName: string;
  handle: string | null;
  status: GrowthChallengeParticipantStatus;
  score: number;
  isCreator: boolean;
  isMe: boolean;
}

export interface GrowthChallengeDto {
  id: string;
  kind: GrowthChallengeKind;
  title: string;
  metric: GrowthChallengeMetric;
  targetValue: number | null;
  durationDays: number;
  status: GrowthChallengeStatus;
  rewardXp: number;
  startAt: string | null;
  endAt: string | null;
  winnerId: string | null;
  completedAt: string | null;
  createdById: string;
  iAmCreator: boolean;
  myStatus: GrowthChallengeParticipantStatus | null;
  groupScore: number;
  participants: GrowthChallengeParticipantDto[];
  createdAt: string;
}

export interface GrowthChallengesListResponse {
  active: GrowthChallengeDto[];
  incoming: GrowthChallengeDto[];
  outgoing: GrowthChallengeDto[];
  completed: GrowthChallengeDto[];
}

export interface CreateGrowthChallengeRequest {
  kind: GrowthChallengeKind;
  title: string;
  metric: GrowthChallengeMetric;
  durationDays: number;
  /** Opponent (FIGHT) or invitees (GROUP). Identity ids — must be accepted friends. */
  inviteeIds: string[];
  targetValue?: number | null;
  rewardXp?: number;
}
