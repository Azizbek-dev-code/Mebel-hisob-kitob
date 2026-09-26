import type { GrowthXpSource } from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export interface GrowthXpEventDto {
  id: string;
  source: GrowthXpSource;
  amount: number;
  sourceEntityId: string;
  dayKey: string;
  summary: string | null;
  createdAt: IsoDateString;
}

export interface GrowthProgressDto {
  totalXp: number;
  level: number;
  /** Soft title key (i18n personal.levelTitleName.*). */
  levelTitleKey: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  percent: number;
  currentStreak: number;
  bestStreak: number;
  lastActivityDayKey: string | null;
  todayXp: number;
  recentEvents: GrowthXpEventDto[];
  /** Unlocked progression rewards (catalog — does not gate core features). */
  unlockedKeys: string[];
  /** Next unlock minLevel / key, if any. */
  nextUnlock: { key: string; minLevel: number; titleKey: string; hintKey: string } | null;
  /** Monthly Global Ranking position when available. */
  globalRank: number | null;
  xpToTop3: number | null;
}

export interface GrowthProgressResponse {
  progress: GrowthProgressDto;
}
