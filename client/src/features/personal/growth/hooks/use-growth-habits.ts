import type {
  CheckInGrowthHabitRequest,
  CreateGrowthHabitRequest,
  UpdateGrowthDailyGoalRequest,
  UpdateGrowthHabitRequest,
  UpsertGrowthDailyGoalsRequest,
} from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalGrowthHabitsService } from '@/services/personal-growth-habits.service';

export const personalGrowthHabitsKeys = {
  all: ['personal', 'growth', 'habits'] as const,
  list: (includeArchived?: boolean) =>
    [...personalGrowthHabitsKeys.all, 'list', includeArchived ? 'archived' : 'active'] as const,
  dailyGoals: (dayKey?: string) =>
    [...personalGrowthHabitsKeys.all, 'daily-goals', dayKey ?? 'today'] as const,
  progress: () => [...personalGrowthHabitsKeys.all, 'today-progress'] as const,
};

function invalidateHabits(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: personalGrowthHabitsKeys.all });
  void queryClient.invalidateQueries({ queryKey: ['personal'] });
}

export function useGrowthHabits(includeArchived = false) {
  return useQuery({
    queryKey: personalGrowthHabitsKeys.list(includeArchived),
    queryFn: ({ signal }) => personalGrowthHabitsService.list(includeArchived, signal),
  });
}

export function useGrowthDailyGoals(dayKey?: string) {
  return useQuery({
    queryKey: personalGrowthHabitsKeys.dailyGoals(dayKey),
    queryFn: ({ signal }) => personalGrowthHabitsService.dailyGoals(dayKey, signal),
  });
}

export function useTodayGrowthProgress() {
  return useQuery({
    queryKey: personalGrowthHabitsKeys.progress(),
    queryFn: async ({ signal }) => {
      const data = await personalGrowthHabitsService.todayProgress(signal);
      return data.progress;
    },
  });
}

export function useCreateGrowthHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGrowthHabitRequest) => personalGrowthHabitsService.create(body),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useUpdateGrowthHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateGrowthHabitRequest }) =>
      personalGrowthHabitsService.update(id, body),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useCheckInGrowthHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: CheckInGrowthHabitRequest }) =>
      personalGrowthHabitsService.checkIn(id, body ?? {}),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useUpsertGrowthDailyGoals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertGrowthDailyGoalsRequest) =>
      personalGrowthHabitsService.upsertDailyGoals(body),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useUpdateGrowthDailyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateGrowthDailyGoalRequest }) =>
      personalGrowthHabitsService.updateDailyGoal(id, body),
    onSuccess: () => invalidateHabits(queryClient),
  });
}
