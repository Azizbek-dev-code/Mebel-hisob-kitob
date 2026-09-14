import type {
  CreatePersonalBudgetRequest,
  CreatePersonalGoalContributionRequest,
  CreatePersonalSavingGoalRequest,
  UpdatePersonalBudgetRequest,
  UpdatePersonalSavingGoalRequest,
} from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalPlanningService } from '@/services/personal-planning.service';

export const personalPlanningKeys = {
  budgets: ['personal', 'budgets'] as const,
  goals: ['personal', 'goals'] as const,
};

function invalidatePlanning(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['personal'] });
}

export function usePersonalBudgets() {
  return useQuery({
    queryKey: personalPlanningKeys.budgets,
    queryFn: ({ signal }) => personalPlanningService.budgets(signal),
  });
}

export function useCreatePersonalBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePersonalBudgetRequest) => personalPlanningService.createBudget(body),
    onSuccess: () => invalidatePlanning(queryClient),
  });
}

export function useUpdatePersonalBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePersonalBudgetRequest }) =>
      personalPlanningService.updateBudget(id, body),
    onSuccess: () => invalidatePlanning(queryClient),
  });
}

export function usePersonalSavingGoals() {
  return useQuery({
    queryKey: personalPlanningKeys.goals,
    queryFn: ({ signal }) => personalPlanningService.goals(signal),
  });
}

export function useCreatePersonalSavingGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePersonalSavingGoalRequest) => personalPlanningService.createGoal(body),
    onSuccess: () => invalidatePlanning(queryClient),
  });
}

export function useUpdatePersonalSavingGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePersonalSavingGoalRequest }) =>
      personalPlanningService.updateGoal(id, body),
    onSuccess: () => invalidatePlanning(queryClient),
  });
}

export function useContributePersonalGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CreatePersonalGoalContributionRequest }) =>
      personalPlanningService.contribute(id, body),
    onSuccess: () => invalidatePlanning(queryClient),
  });
}
