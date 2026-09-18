import type { IsoDateString } from './api.js';

export interface GrowthAchievementDto {
  key: string;
  titleKey: string;
  hintKey: string;
  rewardXp: number;
  comingSoon: boolean;
  unlocked: boolean;
  unlockedAt: IsoDateString | null;
}

export interface GrowthAchievementsResponse {
  items: GrowthAchievementDto[];
  unlockedCount: number;
  totalCount: number;
  /** Keys unlocked in the latest evaluate call (empty on plain GET). */
  newlyUnlocked: string[];
}
