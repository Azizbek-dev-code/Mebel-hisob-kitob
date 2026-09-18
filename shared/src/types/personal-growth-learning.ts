import type {
  GrowthFocusStatus,
  GrowthLearningCategory,
  GrowthLearningGoalStatus,
} from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export interface GrowthLearningMilestoneDto {
  id: string;
  goalId: string;
  title: string;
  targetValue: number;
  isReached: boolean;
  reachedAt: IsoDateString | null;
  sortOrder: number;
}

export interface GrowthLearningGoalDto {
  id: string;
  title: string;
  description: string | null;
  category: GrowthLearningCategory;
  status: GrowthLearningGoalStatus;
  targetValue: number;
  targetUnit: string;
  currentValue: number;
  deadline: IsoDateString | null;
  totalStudyMinutes: number;
  progressPercent: number;
  sortOrder: number;
  milestones: GrowthLearningMilestoneDto[];
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface GrowthLearningSessionDto {
  id: string;
  goalId: string | null;
  goalTitle: string | null;
  status: GrowthFocusStatus;
  plannedMinutes: number | null;
  startedAt: IsoDateString;
  endedAt: IsoDateString | null;
  durationSeconds: number | null;
  creditedMinutes: number;
  note: string | null;
  discardReason: string | null;
  createdAt: IsoDateString;
}

export interface GrowthLearningListResponse {
  items: GrowthLearningGoalDto[];
  activeCount: number;
  todayStudyMinutes: number;
  weekStudyMinutes: number;
}

export interface GrowthLearningStatsResponse {
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  activeGoals: number;
  completedGoals: number;
}

export interface CreateGrowthLearningGoalRequest {
  title: string;
  description?: string | null;
  category?: GrowthLearningCategory;
  targetValue: number;
  targetUnit?: string;
  currentValue?: number;
  deadline?: string | null;
  milestones?: Array<{ title: string; targetValue: number }>;
}

export interface UpdateGrowthLearningGoalRequest {
  title?: string;
  description?: string | null;
  category?: GrowthLearningCategory;
  status?: GrowthLearningGoalStatus;
  targetValue?: number;
  targetUnit?: string;
  currentValue?: number;
  deadline?: string | null;
  sortOrder?: number;
}

export interface LogGrowthLearningSessionRequest {
  goalId?: string | null;
  /** Quick log minutes (1–240). */
  minutes: number;
  note?: string | null;
  /** Optional ISO start; defaults to now - minutes. */
  startedAt?: string | null;
}

export interface CreateGrowthLearningMilestoneRequest {
  title: string;
  targetValue: number;
}
