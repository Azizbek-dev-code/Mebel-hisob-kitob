import type {
  CreateGrowthLearningGoalRequest,
  LogGrowthLearningSessionRequest,
  UpdateGrowthLearningGoalRequest,
} from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalGrowthXpKeys } from '@/features/personal/growth/hooks/use-growth-xp';
import { personalGrowthLearningService } from '@/services/personal-growth-learning.service';

export const personalGrowthLearningKeys = {
  all: ['personal', 'growth', 'learning'] as const,
  list: (includeArchived?: boolean) =>
    [...personalGrowthLearningKeys.all, 'list', includeArchived ? 'all' : 'active'] as const,
  stats: () => [...personalGrowthLearningKeys.all, 'stats'] as const,
};

function invalidateLearning(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: personalGrowthLearningKeys.all });
  void queryClient.invalidateQueries({ queryKey: personalGrowthXpKeys.all });
}

export function useGrowthLearningGoals(includeArchived = false) {
  return useQuery({
    queryKey: personalGrowthLearningKeys.list(includeArchived),
    queryFn: ({ signal }) => personalGrowthLearningService.list(includeArchived, signal),
  });
}

export function useGrowthLearningStats() {
  return useQuery({
    queryKey: personalGrowthLearningKeys.stats(),
    queryFn: async ({ signal }) => {
      const data = await personalGrowthLearningService.stats(signal);
      return data.stats;
    },
  });
}

export function useCreateGrowthLearningGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGrowthLearningGoalRequest) =>
      personalGrowthLearningService.create(body),
    onSuccess: () => invalidateLearning(queryClient),
  });
}

export function useUpdateGrowthLearningGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateGrowthLearningGoalRequest }) =>
      personalGrowthLearningService.update(id, body),
    onSuccess: () => invalidateLearning(queryClient),
  });
}

export function useLogGrowthLearningSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LogGrowthLearningSessionRequest) =>
      personalGrowthLearningService.logSession(body),
    onSuccess: () => invalidateLearning(queryClient),
  });
}
