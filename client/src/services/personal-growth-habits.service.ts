import type {
  CheckInGrowthHabitRequest,
  ClearGrowthHabitDayRequest,
  CreateGrowthHabitLogRequest,
  CreateGrowthHabitRequest,
  GrowthDailyGoalDto,
  GrowthDailyGoalsResponse,
  GrowthHabitDetailResponse,
  GrowthHabitDto,
  GrowthHabitListResponse,
  GrowthHabitProgressPeriod,
  GrowthTodayProgressResponse,
  HabitLogsResponse,
  HabitProgressResponse,
  HabitStatisticsDto,
  SkipGrowthHabitRequest,
  ToggleHabitChecklistTickRequest,
  UpdateGrowthDailyGoalRequest,
  UpdateGrowthHabitLogRequest,
  UpdateGrowthHabitRequest,
  UpsertGrowthDailyGoalsRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

function rangeQs(query?: {
  from?: string;
  to?: string;
  period?: GrowthHabitProgressPeriod;
  includeArchived?: boolean;
  dayKey?: string;
}) {
  if (!query) return '';
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.period) params.set('period', query.period);
  if (query.includeArchived) params.set('includeArchived', 'true');
  if (query.dayKey) params.set('dayKey', query.dayKey);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const personalGrowthHabitsService = {
  list(includeArchived = false, signal?: AbortSignal, dayKey?: string) {
    const params = new URLSearchParams();
    if (includeArchived) params.set('includeArchived', 'true');
    if (dayKey) params.set('dayKey', dayKey);
    const qs = params.toString();
    return apiClient.get<GrowthHabitListResponse>(`/personal/growth/habits${qs ? `?${qs}` : ''}`, {
      signal,
    });
  },
  get(id: string, signal?: AbortSignal) {
    return apiClient.get<{ habit: GrowthHabitDto }>(`/personal/growth/habits/${id}`, { signal });
  },
  detail(id: string, signal?: AbortSignal) {
    return apiClient.get<GrowthHabitDetailResponse>(`/personal/growth/habits/${id}/detail`, { signal });
  },
  create(body: CreateGrowthHabitRequest) {
    return apiClient.post<{ habit: GrowthHabitDto }>('/personal/growth/habits', { body });
  },
  update(id: string, body: UpdateGrowthHabitRequest) {
    return apiClient.patch<{ habit: GrowthHabitDto }>(`/personal/growth/habits/${id}`, { body });
  },
  checkIn(id: string, body: CheckInGrowthHabitRequest = {}) {
    return apiClient.post<{ habit: GrowthHabitDto }>(`/personal/growth/habits/${id}/check-in`, {
      body,
    });
  },
  clearDay(id: string, body: ClearGrowthHabitDayRequest = {}) {
    return apiClient.post<{ habit: GrowthHabitDto }>(`/personal/growth/habits/${id}/clear-day`, {
      body,
    });
  },
  addLog(id: string, body: CreateGrowthHabitLogRequest) {
    return apiClient.post<{ habit: GrowthHabitDto }>(`/personal/growth/habits/${id}/logs`, { body });
  },
  updateLog(id: string, logId: string, body: UpdateGrowthHabitLogRequest) {
    return apiClient.patch<{ habit: GrowthHabitDto }>(`/personal/growth/habits/${id}/logs/${logId}`, {
      body,
    });
  },
  deleteLog(id: string, logId: string) {
    return apiClient.delete<{ habit: GrowthHabitDto }>(`/personal/growth/habits/${id}/logs/${logId}`);
  },
  logs(id: string, query?: { from?: string; to?: string }, signal?: AbortSignal) {
    return apiClient.get<HabitLogsResponse>(`/personal/growth/habits/${id}/logs${rangeQs(query)}`, {
      signal,
    });
  },
  skip(id: string, body: SkipGrowthHabitRequest = {}) {
    return apiClient.post<{ habit: GrowthHabitDto }>(`/personal/growth/habits/${id}/skip`, { body });
  },
  fail(id: string, body: SkipGrowthHabitRequest = {}) {
    return apiClient.post<{ habit: GrowthHabitDto }>(`/personal/growth/habits/${id}/fail`, { body });
  },
  toggleChecklist(id: string, body: ToggleHabitChecklistTickRequest) {
    return apiClient.post<{ items: GrowthHabitDto['checklist'] }>(
      `/personal/growth/habits/${id}/checklist-ticks`,
      { body },
    );
  },
  statistics(
    id: string,
    query?: { from?: string; to?: string; period?: GrowthHabitProgressPeriod },
    signal?: AbortSignal,
  ) {
    return apiClient.get<HabitStatisticsDto>(
      `/personal/growth/habits/${id}/statistics${rangeQs(query)}`,
      { signal },
    );
  },
  progress(
    query?: {
      from?: string;
      to?: string;
      period?: GrowthHabitProgressPeriod;
      includeArchived?: boolean;
    },
    signal?: AbortSignal,
  ) {
    return apiClient.get<HabitProgressResponse>(`/personal/growth/habits/progress${rangeQs(query)}`, {
      signal,
    });
  },
  dailyGoals(dayKey?: string, signal?: AbortSignal) {
    const qs = dayKey ? `?dayKey=${encodeURIComponent(dayKey)}` : '';
    return apiClient.get<GrowthDailyGoalsResponse>(`/personal/growth/daily-goals${qs}`, {
      signal,
    });
  },
  upsertDailyGoals(body: UpsertGrowthDailyGoalsRequest) {
    return apiClient.put<GrowthDailyGoalsResponse>('/personal/growth/daily-goals', { body });
  },
  updateDailyGoal(id: string, body: UpdateGrowthDailyGoalRequest) {
    return apiClient.patch<{ goal: GrowthDailyGoalDto }>(`/personal/growth/daily-goals/${id}`, {
      body,
    });
  },
  todayProgress(signal?: AbortSignal) {
    return apiClient.get<{ progress: GrowthTodayProgressResponse }>(
      '/personal/growth/today-progress',
      { signal },
    );
  },
};
