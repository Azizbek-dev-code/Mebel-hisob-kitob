import type {
  CheckInGrowthHabitRequest,
  CreateGrowthHabitRequest,
  GrowthDailyGoalDto,
  GrowthDailyGoalsResponse,
  GrowthHabitDto,
  GrowthHabitListResponse,
  GrowthTodayProgressResponse,
  UpdateGrowthDailyGoalRequest,
  UpdateGrowthHabitRequest,
  UpsertGrowthDailyGoalsRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalGrowthHabitsService = {
  list(includeArchived = false, signal?: AbortSignal) {
    const qs = includeArchived ? '?includeArchived=true' : '';
    return apiClient.get<GrowthHabitListResponse>(`/personal/growth/habits${qs}`, { signal });
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
