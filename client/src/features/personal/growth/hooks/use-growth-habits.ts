import type {
  CheckInGrowthHabitRequest,
  ClearGrowthHabitDayRequest,
  CreateGrowthHabitLogRequest,
  CreateGrowthHabitRequest,
  GrowthHabitProgressPeriod,
  SkipGrowthHabitRequest,
  ToggleHabitChecklistTickRequest,
  UpdateGrowthDailyGoalRequest,
  UpdateGrowthHabitRequest,
  UpsertGrowthDailyGoalsRequest,
} from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalGrowthXpKeys } from '@/features/personal/growth/hooks/use-growth-xp';
import { personalGrowthHabitsService } from '@/services/personal-growth-habits.service';

export const personalGrowthHabitsKeys = {
  all: ['personal', 'growth', 'habits'] as const,
  list: (includeArchived?: boolean, dayKey?: string) =>
    [...personalGrowthHabitsKeys.all, 'list', includeArchived ? 'archived' : 'active', dayKey ?? 'today'] as const,
  detail: (id: string) => [...personalGrowthHabitsKeys.all, 'detail', id] as const,
  statistics: (id: string, period?: string, from?: string, to?: string) =>
    [...personalGrowthHabitsKeys.all, 'statistics', id, period ?? 'MONTH', from ?? '', to ?? ''] as const,
  progress: (period?: string, from?: string, to?: string, category?: string) =>
    [...personalGrowthHabitsKeys.all, 'progress', period ?? 'MONTH', from ?? '', to ?? '', category ?? ''] as const,
  dailyGoals: (dayKey?: string) =>
    [...personalGrowthHabitsKeys.all, 'daily-goals', dayKey ?? 'today'] as const,
  today: () => [...personalGrowthHabitsKeys.all, 'today-progress'] as const,
};

function invalidateHabits(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: personalGrowthHabitsKeys.all });
  void queryClient.invalidateQueries({ queryKey: personalGrowthXpKeys.all });
}

export function useGrowthHabits(includeArchived = false, dayKey?: string) {
  return useQuery({
    queryKey: personalGrowthHabitsKeys.list(includeArchived, dayKey),
    queryFn: ({ signal }) => personalGrowthHabitsService.list(includeArchived, signal, dayKey),
    placeholderData: (previous) => previous,
  });
}

export function useGrowthHabitDetail(id: string | undefined) {
  return useQuery({
    queryKey: personalGrowthHabitsKeys.detail(id ?? ''),
    queryFn: ({ signal }) => personalGrowthHabitsService.detail(id!, signal),
    enabled: Boolean(id),
  });
}

export function useGrowthHabitStatistics(
  id: string | undefined,
  query: { period?: GrowthHabitProgressPeriod; from?: string; to?: string },
) {
  return useQuery({
    queryKey: personalGrowthHabitsKeys.statistics(id ?? '', query.period, query.from, query.to),
    queryFn: ({ signal }) => personalGrowthHabitsService.statistics(id!, query, signal),
    enabled: Boolean(id),
  });
}

export function useGrowthHabitsProgress(query: {
  period?: GrowthHabitProgressPeriod;
  from?: string;
  to?: string;
  includeArchived?: boolean;
  category?: string;
}) {
  return useQuery({
    queryKey: personalGrowthHabitsKeys.progress(query.period, query.from, query.to, query.category),
    queryFn: ({ signal }) => personalGrowthHabitsService.progress(query, signal),
    placeholderData: (previous) => previous,
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
    queryKey: personalGrowthHabitsKeys.today(),
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

export function useClearGrowthHabitDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: ClearGrowthHabitDayRequest }) =>
      personalGrowthHabitsService.clearDay(id, body ?? {}),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useAddGrowthHabitLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CreateGrowthHabitLogRequest }) =>
      personalGrowthHabitsService.addLog(id, body),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useDeleteGrowthHabitLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, logId }: { id: string; logId: string }) =>
      personalGrowthHabitsService.deleteLog(id, logId),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useSkipGrowthHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: SkipGrowthHabitRequest }) =>
      personalGrowthHabitsService.skip(id, body ?? {}),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useFailGrowthHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: SkipGrowthHabitRequest }) =>
      personalGrowthHabitsService.fail(id, body ?? {}),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useGrowthHabitLogs(id: string | undefined, query?: { from?: string; to?: string }, enabled = true) {
  return useQuery({
    queryKey: [...personalGrowthHabitsKeys.all, 'logs', id ?? '', query?.from ?? '', query?.to ?? ''],
    queryFn: ({ signal }) => personalGrowthHabitsService.logs(id!, query, signal),
    enabled: Boolean(id) && enabled,
  });
}

export function useToggleHabitChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ToggleHabitChecklistTickRequest }) =>
      personalGrowthHabitsService.toggleChecklist(id, body),
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
