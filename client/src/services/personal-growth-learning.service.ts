import type {
  CreateGrowthLearningGoalRequest,
  CreateGrowthLearningMilestoneRequest,
  GrowthLearningGoalDto,
  GrowthLearningListResponse,
  GrowthLearningStatsResponse,
  LogGrowthLearningSessionRequest,
  UpdateGrowthLearningGoalRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalGrowthLearningService = {
  list(includeArchived = false, signal?: AbortSignal) {
    const qs = includeArchived ? '?includeArchived=true' : '';
    return apiClient.get<GrowthLearningListResponse>(`/personal/growth/learning${qs}`, {
      signal,
    });
  },
  stats(signal?: AbortSignal) {
    return apiClient.get<{ stats: GrowthLearningStatsResponse }>(
      '/personal/growth/learning/stats',
      { signal },
    );
  },
  create(body: CreateGrowthLearningGoalRequest) {
    return apiClient.post<{ goal: GrowthLearningGoalDto }>('/personal/growth/learning', {
      body,
    });
  },
  update(id: string, body: UpdateGrowthLearningGoalRequest) {
    return apiClient.patch<{ goal: GrowthLearningGoalDto }>(`/personal/growth/learning/${id}`, {
      body,
    });
  },
  addMilestone(id: string, body: CreateGrowthLearningMilestoneRequest) {
    return apiClient.post<{ goal: GrowthLearningGoalDto }>(
      `/personal/growth/learning/${id}/milestones`,
      { body },
    );
  },
  logSession(body: LogGrowthLearningSessionRequest) {
    return apiClient.post<{
      session: { creditedMinutes: number; discardReason: string | null };
      goal: GrowthLearningGoalDto | null;
    }>('/personal/growth/learning/sessions', { body });
  },
};
