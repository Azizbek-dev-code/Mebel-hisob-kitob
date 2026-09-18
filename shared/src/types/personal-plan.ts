import type { GrowthEventPriority, GrowthEventRecurrence } from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export interface GrowthCalendarEventDto {
  id: string;
  title: string;
  note: string | null;
  category: string | null;
  priority: GrowthEventPriority;
  startsAt: IsoDateString;
  endsAt: IsoDateString | null;
  allDay: boolean;
  recurrence: GrowthEventRecurrence;
  intervalDays: number | null;
  remindMinutesBefore: number | null;
  /** startsAt − remindMinutesBefore when reminder is set. */
  remindAt: IsoDateString | null;
  isCancelled: boolean;
  linkedGoalId: string | null;
  linkedTodoId: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface GrowthCalendarEventListResponse {
  items: GrowthCalendarEventDto[];
  /** Days (YYYY-MM-DD) that have at least one active event in range. */
  daysWithEvents: string[];
}

export interface GrowthDayPlanResponse {
  date: string;
  items: GrowthCalendarEventDto[];
}

export interface GrowthUpcomingRemindersResponse {
  items: GrowthCalendarEventDto[];
}

export interface CreateGrowthCalendarEventRequest {
  title: string;
  note?: string | null;
  category?: string | null;
  priority?: GrowthEventPriority;
  startsAt: string;
  endsAt?: string | null;
  allDay?: boolean;
  recurrence?: GrowthEventRecurrence;
  intervalDays?: number | null;
  remindMinutesBefore?: number | null;
  linkedGoalId?: string | null;
  linkedTodoId?: string | null;
}

export interface UpdateGrowthCalendarEventRequest {
  title?: string;
  note?: string | null;
  category?: string | null;
  priority?: GrowthEventPriority;
  startsAt?: string;
  endsAt?: string | null;
  allDay?: boolean;
  recurrence?: GrowthEventRecurrence;
  intervalDays?: number | null;
  remindMinutesBefore?: number | null;
  isCancelled?: boolean;
  linkedGoalId?: string | null;
  linkedTodoId?: string | null;
}
