import type {
  GlobalCompetitionStatus,
  GlobalRewardDeliveryStatus,
  GlobalRewardPlace,
} from '../constants/enums.js';
import type { IsoDateString } from './api.js';
import type { GlobalRankingEntryDto } from './personal-growth-ranking.js';

export interface GlobalMonthlyRewardDto {
  id: string;
  place: GlobalRewardPlace;
  title: string;
  description: string | null;
  valueText: string | null;
  imageUrl: string | null;
}

export interface GlobalMonthlyCompetitionDto {
  id: string;
  periodKey: string;
  title: string;
  description: string | null;
  startsAt: IsoDateString;
  endsAt: IsoDateString;
  status: GlobalCompetitionStatus;
  finalizedAt: IsoDateString | null;
  rewards: GlobalMonthlyRewardDto[];
}

export interface GlobalMonthlyWinnerDto {
  id: string;
  place: number;
  identityId: string;
  displayName: string;
  handle: string | null;
  level: number;
  periodXp: number;
  totalXp: number;
  deliveryStatus: GlobalRewardDeliveryStatus;
  reward: GlobalMonthlyRewardDto | null;
}

export interface GlobalMonthlyCompetitionOverviewDto {
  competition: GlobalMonthlyCompetitionDto | null;
  /** Live Top 3 for an active month; frozen winners when finalized. */
  top3: GlobalRankingEntryDto[];
  myEntry: GlobalRankingEntryDto | null;
  /** XP gap from current user to 3rd place (0 if in Top 3 / no board). */
  xpToTop3: number | null;
  showMeInRanking: boolean;
}

export interface GlobalMonthlyWinnersHistoryItemDto {
  competition: GlobalMonthlyCompetitionDto;
  winners: GlobalMonthlyWinnerDto[];
}

export interface GlobalMonthlyWinnersHistoryResponse {
  items: GlobalMonthlyWinnersHistoryItemDto[];
}

export interface UpsertGlobalMonthlyCompetitionBody {
  periodKey: string;
  title: string;
  description?: string | null;
  startsAt: IsoDateString;
  endsAt: IsoDateString;
  status?: GlobalCompetitionStatus;
}

export interface UpsertGlobalMonthlyRewardBody {
  place: GlobalRewardPlace;
  title: string;
  description?: string | null;
  valueText?: string | null;
  imageUrl?: string | null;
}

export interface UpdateGlobalWinnerDeliveryBody {
  deliveryStatus: GlobalRewardDeliveryStatus;
}

export interface PlatformGlobalCompetitionListResponse {
  items: GlobalMonthlyCompetitionDto[];
}

export interface PlatformGlobalCompetitionDetailDto extends GlobalMonthlyCompetitionDto {
  winners: GlobalMonthlyWinnerDto[];
}
