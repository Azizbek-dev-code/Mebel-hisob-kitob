import type {
  GrowthEventPriority,
  GrowthEventRecurrence,
  GrowthTodoStatus,
} from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export interface GrowthTodoDto {
  id: string;
  title: string;
  description: string | null;
  priority: GrowthEventPriority;
  status: GrowthTodoStatus;
  category: string | null;
  dueAt: IsoDateString | null;
  remindMinutesBefore: number | null;
  remindAt: IsoDateString | null;
  estimatedMinutes: number | null;
  actualMinutes: number;
  recurrence: GrowthEventRecurrence;
  intervalDays: number | null;
  isDailyFocus: boolean;
  completedAt: IsoDateString | null;
  linkedGoalId: string | null;
  linkedCalendarEventId: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface GrowthTodoListResponse {
  items: GrowthTodoDto[];
  openCount: number;
  doneTodayCount: number;
}

export interface GrowthTodayTodosResponse {
  /** Explicit daily focus (≤3) plus smart fill from open/due tasks. */
  focus: GrowthTodoDto[];
  dueToday: GrowthTodoDto[];
  overdue: GrowthTodoDto[];
}

export interface CreateGrowthTodoRequest {
  title: string;
  description?: string | null;
  priority?: GrowthEventPriority;
  category?: string | null;
  dueAt?: string | null;
  remindMinutesBefore?: number | null;
  estimatedMinutes?: number | null;
  recurrence?: GrowthEventRecurrence;
  intervalDays?: number | null;
  isDailyFocus?: boolean;
  linkedGoalId?: string | null;
  linkedCalendarEventId?: string | null;
  /** When true, also create a same-day calendar event and link it. */
  addToCalendar?: boolean;
}

export interface UpdateGrowthTodoRequest {
  title?: string;
  description?: string | null;
  priority?: GrowthEventPriority;
  status?: GrowthTodoStatus;
  category?: string | null;
  dueAt?: string | null;
  remindMinutesBefore?: number | null;
  estimatedMinutes?: number | null;
  actualMinutes?: number;
  recurrence?: GrowthEventRecurrence;
  intervalDays?: number | null;
  isDailyFocus?: boolean;
  linkedGoalId?: string | null;
  linkedCalendarEventId?: string | null;
}

export interface SuggestGrowthTodoRequest {
  title: string;
}

export interface SuggestGrowthTodoResponse {
  title: string;
  estimatedMinutes: number | null;
  priority: GrowthEventPriority;
  dueHint: 'TODAY' | 'TOMORROW' | null;
  category: string | null;
}
