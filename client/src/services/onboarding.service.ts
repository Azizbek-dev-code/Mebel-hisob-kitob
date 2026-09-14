import type {
  CompletePersonalOnboardingRequest,
  CompletePersonalOnboardingResponse,
  OnboardingAnswerRowDto,
  OnboardingCatalogResponse,
  OnboardingNeedDto,
  OnboardingNeedMappingDto,
  OnboardingQuestionDto,
  OnboardingSolutionDto,
  OnboardingStartResponse,
  OnboardingStatsResponse,
  OnboardingSubmissionDto,
  ReorderOnboardingItemsRequest,
  SaveOnboardingAnswersRequest,
  UpsertOnboardingMappingRequest,
  UpsertOnboardingNeedRequest,
  UpsertOnboardingQuestionRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const onboardingService = {
  catalog(signal?: AbortSignal, params?: { accountType?: string; businessType?: string }) {
    const search = new URLSearchParams();
    if (params?.accountType) search.set('accountType', params.accountType);
    if (params?.businessType) search.set('businessType', params.businessType);
    const query = search.toString();
    return apiClient.get<OnboardingCatalogResponse>(
      `/onboarding/catalog${query ? `?${query}` : ''}`,
      { signal },
    );
  },

  start() {
    return apiClient.post<OnboardingStartResponse>('/onboarding', { body: {} });
  },

  get(token: string, signal?: AbortSignal) {
    return apiClient.get<{ submission: OnboardingSubmissionDto }>(`/onboarding/${token}`, {
      signal,
    });
  },

  save(token: string, body: SaveOnboardingAnswersRequest) {
    return apiClient.patch<{ submission: OnboardingSubmissionDto }>(`/onboarding/${token}`, {
      body,
    });
  },

  completeRegister(token: string, body: CompletePersonalOnboardingRequest) {
    return apiClient.post<CompletePersonalOnboardingResponse>(
      `/onboarding/${token}/complete-register`,
      { body },
    );
  },

  completeAuthenticated(token: string, body?: { name?: string }) {
    return apiClient.post<CompletePersonalOnboardingResponse>(`/onboarding/${token}/complete`, {
      body: body ?? {},
    });
  },

  completeBusiness(token: string) {
    return apiClient.post<{ submission: OnboardingSubmissionDto }>(
      `/onboarding/${token}/complete-business`,
    );
  },

  stats(signal?: AbortSignal) {
    return apiClient.get<OnboardingStatsResponse>('/platform/onboarding/stats', { signal });
  },

  adminQuestions(signal?: AbortSignal) {
    return apiClient.get<{ items: OnboardingQuestionDto[] }>('/platform/onboarding/questions', {
      signal,
    });
  },

  createQuestion(body: UpsertOnboardingQuestionRequest) {
    return apiClient.post<{ item: OnboardingQuestionDto }>('/platform/onboarding/questions', {
      body,
    });
  },

  updateQuestion(id: string, body: UpsertOnboardingQuestionRequest) {
    return apiClient.patch<{ item: OnboardingQuestionDto }>(`/platform/onboarding/questions/${id}`, {
      body,
    });
  },

  deactivateQuestion(id: string) {
    return apiClient.post<{ item: OnboardingQuestionDto }>(
      `/platform/onboarding/questions/${id}/deactivate`,
      { body: {} },
    );
  },

  reorderQuestions(body: ReorderOnboardingItemsRequest) {
    return apiClient.post<{ items: OnboardingQuestionDto[] }>(
      '/platform/onboarding/questions/reorder',
      { body },
    );
  },

  adminAnswers(signal?: AbortSignal) {
    return apiClient.get<{ items: OnboardingAnswerRowDto[] }>('/platform/onboarding/answers', {
      signal,
    });
  },

  adminNeeds(signal?: AbortSignal) {
    return apiClient.get<{ items: OnboardingNeedDto[] }>('/platform/onboarding/needs', { signal });
  },

  createNeed(body: UpsertOnboardingNeedRequest) {
    return apiClient.post<{ item: OnboardingNeedDto }>('/platform/onboarding/needs', { body });
  },

  updateNeed(id: string, body: UpsertOnboardingNeedRequest) {
    return apiClient.patch<{ item: OnboardingNeedDto }>(`/platform/onboarding/needs/${id}`, {
      body,
    });
  },

  deactivateNeed(id: string) {
    return apiClient.post<{ item: OnboardingNeedDto }>(`/platform/onboarding/needs/${id}/deactivate`, {
      body: {},
    });
  },

  adminSolutions(signal?: AbortSignal) {
    return apiClient.get<{ items: OnboardingSolutionDto[] }>('/platform/onboarding/solutions', {
      signal,
    });
  },

  createSolution(body: UpsertOnboardingNeedRequest) {
    return apiClient.post<{ item: OnboardingSolutionDto }>('/platform/onboarding/solutions', {
      body,
    });
  },

  updateSolution(id: string, body: UpsertOnboardingNeedRequest) {
    return apiClient.patch<{ item: OnboardingSolutionDto }>(`/platform/onboarding/solutions/${id}`, {
      body,
    });
  },

  deactivateSolution(id: string) {
    return apiClient.post<{ item: OnboardingSolutionDto }>(
      `/platform/onboarding/solutions/${id}/deactivate`,
      { body: {} },
    );
  },

  adminMappings(signal?: AbortSignal) {
    return apiClient.get<{ items: OnboardingNeedMappingDto[] }>('/platform/onboarding/mappings', {
      signal,
    });
  },

  createMapping(body: UpsertOnboardingMappingRequest) {
    return apiClient.post<{ item: OnboardingNeedMappingDto }>('/platform/onboarding/mappings', {
      body,
    });
  },

  deleteMapping(id: string) {
    return apiClient.delete<{ ok: boolean }>(`/platform/onboarding/mappings/${id}`);
  },
};
