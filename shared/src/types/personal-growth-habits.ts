import type { GrowthHabitFrequency } from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export interface GrowthHabitCheckInDto {
  id: string;
  habitId: string;
  dayKey: string;
  value: number;
  note: string | null;
  createdAt: IsoDateString;
}

export interface GrowthHabitDto {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  frequency: GrowthHabitFrequency;
  intervalDays: number | null;
  targetValue: number;
  targetUnit: string;
  remindMinutesBefore: number | null;
  linkedGoalId: string | null;
  isArchived: boolean;
  sortOrder: number;
  currentStreak: number;
  bestStreak: number;
  /** Today’s check-in if any. */
  todayCheckIn: GrowthHabitCheckInDto | null;
  /** Whether another check-in is still needed for the current period. */
  dueToday: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface GrowthHabitListResponse {
  items: GrowthHabitDto[];
  activeCount: number;
  dueTodayCount: number;
  /** Longest current streak among active habits. */
  bestCurrentStreak: number;
}

export interface CreateGrowthHabitRequest {
  title: string;
  description?: string | null;
  category?: string | null;
  frequency?: GrowthHabitFrequency;
  intervalDays?: number | null;
  targetValue?: number;
  targetUnit?: string;
  remindMinutesBefore?: number | null;
  linkedGoalId?: string | null;
}

export interface UpdateGrowthHabitRequest {
  title?: string;
  description?: string | null;
  category?: string | null;
  frequency?: GrowthHabitFrequency;
  intervalDays?: number | null;
  targetValue?: number;
  targetUnit?: string;
  remindMinutesBefore?: number | null;
  linkedGoalId?: string | null;
  isArchived?: boolean;
  sortOrder?: number;
}

export interface CheckInGrowthHabitRequest {
  /** Defaults to today (UTC). */
  dayKey?: string;
  value?: number;
  note?: string | null;
}

export interface GrowthDailyGoalDto {
  id: string;
  dayKey: string;
  title: string;
  estimatedMinutes: number | null;
  isDone: boolean;
  sortOrder: number;
  completedAt: IsoDateString | null;
  createdAt: IsoDateString;
}

export interface GrowthDailyGoalsResponse {
  dayKey: string;
  items: GrowthDailyGoalDto[];
  doneCount: number;
  totalCount: number;
}

export interface UpsertGrowthDailyGoalsRequest {
  dayKey?: string;
  items: Array<{
    id?: string;
    title: string;
    estimatedMinutes?: number | null;
    isDone?: boolean;
  }>;
}

export interface UpdateGrowthDailyGoalRequest {
  title?: string;
  estimatedMinutes?: number | null;
  isDone?: boolean;
}

export interface GrowthTodayProgressResponse {
  dayKey: string;
  habitsDue: number;
  habitsDone: number;
  dailyGoalsDone: number;
  dailyGoalsTotal: number;
  focusTodosDone: number;
  focusTodosTotal: number;
  /** 0–100 overall completion for Home progress bar. */
  percent: number;
  bestCurrentStreak: number;
}
