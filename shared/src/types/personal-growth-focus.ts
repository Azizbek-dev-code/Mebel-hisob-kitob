import type { GrowthFocusKind, GrowthFocusStatus } from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export interface GrowthFocusSessionDto {
  id: string;
  kind: GrowthFocusKind;
  status: GrowthFocusStatus;
  plannedMinutes: number;
  startedAt: IsoDateString;
  endedAt: IsoDateString | null;
  durationSeconds: number | null;
  creditedMinutes: number;
  discardReason: string | null;
  todoId: string | null;
  todoTitle: string | null;
  linkedGoalId: string | null;
  createdAt: IsoDateString;
}

export interface GrowthFocusStatsDto {
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  todaySessions: number;
  activeSession: GrowthFocusSessionDto | null;
}

export interface GrowthFocusStatsResponse {
  stats: GrowthFocusStatsDto;
}

export interface StartGrowthFocusRequest {
  plannedMinutes: number;
  kind?: GrowthFocusKind;
  todoId?: string | null;
  linkedGoalId?: string | null;
}

export interface CompleteGrowthFocusRequest {
  /** True when user stops early. */
  interrupted?: boolean;
  /** Optional heartbeat claim — capped by server wall-clock. */
  clientReportedSeconds?: number | null;
}

export const GROWTH_FOCUS_PRESETS = [
  { id: '25_5', focusMinutes: 25, breakMinutes: 5 },
  { id: '50_10', focusMinutes: 50, breakMinutes: 10 },
] as const;
