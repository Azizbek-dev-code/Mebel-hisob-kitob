import type {
  CreatePersonalBudgetRequest,
  CreatePersonalGoalContributionRequest,
  CreatePersonalSavingGoalRequest,
  PersonalBudgetListResponse,
  PersonalSavingGoalListResponse,
  UpdatePersonalBudgetRequest,
  UpdatePersonalSavingGoalRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalPlanningService = {
  budgets(signal?: AbortSignal) {
    return apiClient.get<PersonalBudgetListResponse>('/personal/budgets', { signal });
  },
  createBudget(body: CreatePersonalBudgetRequest) {
    return apiClient.post<{ budget: PersonalBudgetListResponse['items'][number] }>(
      '/personal/budgets',
      { body },
    );
  },
  updateBudget(id: string, body: UpdatePersonalBudgetRequest) {
    return apiClient.patch<{ budget: PersonalBudgetListResponse['items'][number] }>(
      `/personal/budgets/${id}`,
      { body },
    );
  },
  goals(signal?: AbortSignal) {
    return apiClient.get<PersonalSavingGoalListResponse>('/personal/goals', { signal });
  },
  createGoal(body: CreatePersonalSavingGoalRequest) {
    return apiClient.post<{ goal: PersonalSavingGoalListResponse['items'][number] }>(
      '/personal/goals',
      { body },
    );
  },
  updateGoal(id: string, body: UpdatePersonalSavingGoalRequest) {
    return apiClient.patch<{ goal: PersonalSavingGoalListResponse['items'][number] }>(
      `/personal/goals/${id}`,
      { body },
    );
  },
  contribute(id: string, body: CreatePersonalGoalContributionRequest) {
    return apiClient.post<{ goal: PersonalSavingGoalListResponse['items'][number] }>(
      `/personal/goals/${id}/contributions`,
      { body },
    );
  },
};
