import type { AppFeedbackKind, GlobalLeaderboardPeriod } from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export interface GlobalRankingEntryDto {
  identityId: string;
  displayName: string;
  handle: string | null;
  level: number;
  totalXp: number;
  periodXp: number;
  currentStreak: number;
  rank: number;
  isMe: boolean;
}

export interface GlobalRankingListResponse {
  period: GlobalLeaderboardPeriod;
  items: GlobalRankingEntryDto[];
  myRank: number | null;
  myEntry: GlobalRankingEntryDto | null;
  /** False when the viewer opted out of the public board. */
  showMeInRanking: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface GlobalRankingProfileFeedbackDto {
  id: string;
  kind: AppFeedbackKind;
  body: string;
  rating: number | null;
  likeCount: number;
  viewCount: number;
  likedByMe: boolean;
  createdAt: IsoDateString;
}

export interface GlobalRankingProfileDto {
  identityId: string;
  displayName: string;
  handle: string | null;
  level: number;
  totalXp: number;
  currentStreak: number;
  friendshipStatus: 'NONE' | 'PENDING_OUTGOING' | 'PENDING_INCOMING' | 'FRIENDS' | 'SELF';
  allowFriendRequests: boolean;
  feedback: GlobalRankingProfileFeedbackDto[];
}

export interface GlobalRankingListQuery {
  period?: GlobalLeaderboardPeriod;
  page?: number;
  pageSize?: number;
}
