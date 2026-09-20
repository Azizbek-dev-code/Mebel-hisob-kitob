import type {
  GrowthHabitBadMode,
  GrowthHabitDayStatus,
  GrowthHabitFrequency,
  GrowthHabitGoalPeriod,
  GrowthHabitKind,
  GrowthHabitProgressPeriod,
  GrowthHabitScheduleKind,
  GrowthHabitTimeOfDay,
} from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export interface GrowthHabitCheckInDto {
  id: string;
  habitId: string;
  dayKey: string;
  value: number;
  note: string | null;
  status: GrowthHabitDayStatus;
  skipped: boolean;
  goalValueSnapshot: number | null;
  goalUnitSnapshot: string | null;
  checklistDone: number;
  checklistTotal: number;
  createdAt: IsoDateString;
}

export interface GrowthHabitLogDto {
  id: string;
  habitId: string;
  dayKey: string;
  value: number;
  note: string | null;
  loggedAt: IsoDateString;
  createdAt: IsoDateString;
}

export interface GrowthHabitChecklistItemDto {
  id: string;
  habitId: string;
  title: string;
  sortOrder: number;
  isArchived: boolean;
  doneToday: boolean;
}

export interface GrowthHabitDto {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  kind: GrowthHabitKind;
  badMode: GrowthHabitBadMode | null;
  icon: string | null;
  color: string | null;
  frequency: GrowthHabitFrequency;
  scheduleKind: GrowthHabitScheduleKind;
  intervalDays: number | null;
  weekdays: number[];
  startDayKey: string | null;
  endDayKey: string | null;
  timeOfDay: GrowthHabitTimeOfDay;
  reminderEnabled: boolean;
  reminderTime: string | null;
  remindMinutesBefore: number | null;
  targetValue: number;
  targetUnit: string;
  goalPeriod: GrowthHabitGoalPeriod;
  notes: string | null;
  stackAfterHabitId: string | null;
  stackCue: string | null;
  linkedGoalId: string | null;
  isArchived: boolean;
  sortOrder: number;
  currentStreak: number;
  bestStreak: number;
  todayCheckIn: GrowthHabitCheckInDto | null;
  todayValue: number;
  todayProgress: number;
  todayStatus: GrowthHabitDayStatus;
  dueToday: boolean;
  checklist: GrowthHabitChecklistItemDto[];
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface GrowthHabitListResponse {
  items: GrowthHabitDto[];
  activeCount: number;
  dueTodayCount: number;
  /** Longest current streak among active habits. */
  bestCurrentStreak: number;
  timezone: string;
  todayKey: string;
}

export interface CreateGrowthHabitChecklistItem {
  title: string;
  sortOrder?: number;
}

export interface CreateGrowthHabitRequest {
  title: string;
  description?: string | null;
  category?: string | null;
  kind?: GrowthHabitKind;
  badMode?: GrowthHabitBadMode | null;
  icon?: string | null;
  color?: string | null;
  frequency?: GrowthHabitFrequency;
  scheduleKind?: GrowthHabitScheduleKind;
  intervalDays?: number | null;
  weekdays?: number[];
  startDayKey?: string | null;
  endDayKey?: string | null;
  timeOfDay?: GrowthHabitTimeOfDay;
  reminderEnabled?: boolean;
  reminderTime?: string | null;
  remindMinutesBefore?: number | null;
  targetValue?: number;
  targetUnit?: string;
  goalPeriod?: GrowthHabitGoalPeriod;
  notes?: string | null;
  stackAfterHabitId?: string | null;
  stackCue?: string | null;
  linkedGoalId?: string | null;
  checklist?: CreateGrowthHabitChecklistItem[];
}

export interface UpdateGrowthHabitRequest {
  title?: string;
  description?: string | null;
  category?: string | null;
  kind?: GrowthHabitKind;
  badMode?: GrowthHabitBadMode | null;
  icon?: string | null;
  color?: string | null;
  frequency?: GrowthHabitFrequency;
  scheduleKind?: GrowthHabitScheduleKind;
  intervalDays?: number | null;
  weekdays?: number[];
  startDayKey?: string | null;
  endDayKey?: string | null;
  timeOfDay?: GrowthHabitTimeOfDay;
  reminderEnabled?: boolean;
  reminderTime?: string | null;
  remindMinutesBefore?: number | null;
  targetValue?: number;
  targetUnit?: string;
  goalPeriod?: GrowthHabitGoalPeriod;
  notes?: string | null;
  stackAfterHabitId?: string | null;
  stackCue?: string | null;
  linkedGoalId?: string | null;
  isArchived?: boolean;
  sortOrder?: number;
  checklist?: CreateGrowthHabitChecklistItem[];
}

export interface CheckInGrowthHabitRequest {
  /** Defaults to today (workspace timezone). */
  dayKey?: string;
  value?: number;
  note?: string | null;
}

export interface CreateGrowthHabitLogRequest {
  dayKey?: string;
  value: number;
  note?: string | null;
  loggedAt?: IsoDateString;
}

export interface UpdateGrowthHabitLogRequest {
  value?: number;
  note?: string | null;
}

export interface SkipGrowthHabitRequest {
  dayKey?: string;
  note?: string | null;
}

export interface ToggleHabitChecklistTickRequest {
  itemId: string;
  dayKey?: string;
  done: boolean;
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

export interface HabitCalendarCellDto {
  dayKey: string;
  status: GrowthHabitDayStatus;
  value: number;
  progress: number;
  scheduled: boolean;
}

export interface HabitTrendPointDto {
  key: string;
  label: string;
  completion: number;
  value: number;
}

export interface HabitStatsKpiDto {
  completion: number;
  consistency: number;
  currentStreak: number;
  longestStreak: number;
  completed: number;
  failed: number;
  skipped: number;
  scheduled: number;
  partial: number;
  average: number;
  totalValue: number;
  goalProgress: number;
}

export interface HabitStatisticsDto {
  habitId: string;
  from: string;
  to: string;
  todayKey: string;
  timezone: string;
  kpi: HabitStatsKpiDto;
  calendar: HabitCalendarCellDto[];
  trend: HabitTrendPointDto[];
}

export interface HabitProgressHabitRowDto {
  habitId: string;
  title: string;
  kind: GrowthHabitKind;
  icon: string | null;
  color: string | null;
  targetUnit: string;
  kpi: HabitStatsKpiDto;
}

export interface HabitInsightDto {
  code: string;
  habitId?: string;
  weekday?: number;
  timeOfDay?: GrowthHabitTimeOfDay;
  delta?: number;
  sampleSize?: number;
  meta?: Record<string, number | string>;
}

export interface HabitRecommendationDto {
  code: string;
  habitId?: string;
  weekday?: number;
  meta?: Record<string, number | string>;
}

export interface HabitCorrelationDto {
  habitIdA: string;
  habitIdB: string;
  titleA: string;
  titleB: string;
  overlapScheduled: number;
  bothCompleted: number;
  rate: number;
}

export interface HabitBestTimeDto {
  bucket: GrowthHabitTimeOfDay;
  count: number;
}

export interface HabitAnalyticsDto {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  timezone: string;
  monthOverMonth: {
    currentCompletion: number;
    previousCompletion: number;
    delta: number;
    currentScheduled: number;
    previousScheduled: number;
  };
  mostBroken: { habitId: string; title: string; failRate: number; sampleSize: number } | null;
  bestWeekday: { weekday: number; completion: number; sampleSize: number } | null;
  bestTime: HabitBestTimeDto | null;
  correlations: HabitCorrelationDto[];
  insights: HabitInsightDto[];
  recommendations: HabitRecommendationDto[];
}

export interface HabitProgressResponse {
  period: GrowthHabitProgressPeriod;
  from: string;
  to: string;
  todayKey: string;
  timezone: string;
  overall: HabitStatsKpiDto;
  calendar: HabitCalendarCellDto[];
  trend: HabitTrendPointDto[];
  habits: HabitProgressHabitRowDto[];
  analytics: HabitAnalyticsDto;
}

export interface GrowthHabitDetailResponse {
  habit: GrowthHabitDto;
  statistics: HabitStatisticsDto;
  logs: GrowthHabitLogDto[];
}

export interface HabitLogsResponse {
  items: GrowthHabitLogDto[];
}
