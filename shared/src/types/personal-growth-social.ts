import type {
  GrowthLeaderboardMetric,
  GrowthLeaderboardPeriod,
} from '../personal-growth/social.js';

export interface GrowthLeaderboardEntryDto {
  rank: number;
  identityId: string;
  fullName: string;
  handle: string | null;
  score: number | null;
  level: number | null;
  isMe: boolean;
  /** False when friend hides activity — score shown as null. */
  scoreVisible: boolean;
}

export interface GrowthLeaderboardResponse {
  period: GrowthLeaderboardPeriod;
  metric: GrowthLeaderboardMetric;
  startDayKey: string;
  endDayKey: string;
  entries: GrowthLeaderboardEntryDto[];
}

export interface GrowthFriendStreakDto {
  pairKey: string;
  friend: {
    identityId: string;
    fullName: string;
    handle: string | null;
  };
  currentStreak: number;
  bestStreak: number;
  lastSharedDayKey: string | null;
  bothActiveToday: boolean;
}

export interface GrowthFriendStreaksResponse {
  items: GrowthFriendStreakDto[];
}
