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
  xpIntoLevel: number;
  xpForNextLevel: number;
  percent: number;
  currentStreak: number;
  bestStreak: number;
  lastActivityDayKey: string | null;
  todayXp: number;
  recentEvents: GrowthXpEventDto[];
}

export interface GrowthProgressResponse {
  progress: GrowthProgressDto;
}
