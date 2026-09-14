import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CompletePersonalOnboardingRequest,
  SaveOnboardingAnswersRequest,
  UpsertOnboardingMappingRequest,
  UpsertOnboardingNeedRequest,
  UpsertOnboardingQuestionRequest,
} from '@furniture-erp/shared';

import { onboardingService } from '@/services/onboarding.service';

export const onboardingQueryKeys = {
  catalog: ['onboarding', 'catalog'] as const,
  submission: (token: string) => ['onboarding', 'submission', token] as const,
  stats: ['platform', 'onboarding-stats'] as const,
  adminQuestions: ['platform', 'onboarding-questions'] as const,
  adminAnswers: ['platform', 'onboarding-answers'] as const,
  adminNeeds: ['platform', 'onboarding-needs'] as const,
  adminSolutions: ['platform', 'onboarding-solutions'] as const,
  adminMappings: ['platform', 'onboarding-mappings'] as const,
};

export function useOnboardingCatalog() {
  return useQuery({
    queryKey: onboardingQueryKeys.catalog,
    queryFn: ({ signal }) => onboardingService.catalog(signal),
    staleTime: 60 * 60_000,
  });
}

export function useStartOnboarding() {
  return useMutation({
    mutationFn: () => onboardingService.start(),
  });
}

export function useSaveOnboarding(token: string | null) {
  return useMutation({
    mutationFn: (body: SaveOnboardingAnswersRequest) => {
      if (!token) throw new Error('Onboarding token missing');
      return onboardingService.save(token, body);
    },
  });
}

export function useCompletePersonalRegister(token: string | null) {
  return useMutation({
    mutationFn: (body: CompletePersonalOnboardingRequest) => {
      if (!token) throw new Error('Onboarding token missing');
      return onboardingService.completeRegister(token, body);
    },
  });
}

export function useCompletePersonalAuthenticated(token: string | null) {
  return useMutation({
    mutationFn: (body?: { name?: string }) => {
      if (!token) throw new Error('Onboarding token missing');
      return onboardingService.completeAuthenticated(token, body);
    },
  });
}

export function useCompleteBusinessOnboarding(token: string | null) {
  return useMutation({
    mutationFn: () => {
      if (!token) throw new Error('Onboarding token missing');
      return onboardingService.completeBusiness(token);
    },
  });
}

export function useOnboardingStats(enabled = true) {
  return useQuery({
    queryKey: onboardingQueryKeys.stats,
    queryFn: ({ signal }) => onboardingService.stats(signal),
    enabled,
  });
}

export function useAdminOnboardingQuestions() {
  return useQuery({
    queryKey: onboardingQueryKeys.adminQuestions,
    queryFn: ({ signal }) => onboardingService.adminQuestions(signal),
  });
}

export function useAdminOnboardingAnswers() {
  return useQuery({
    queryKey: onboardingQueryKeys.adminAnswers,
    queryFn: ({ signal }) => onboardingService.adminAnswers(signal),
  });
}

export function useAdminOnboardingNeeds() {
  return useQuery({
    queryKey: onboardingQueryKeys.adminNeeds,
    queryFn: ({ signal }) => onboardingService.adminNeeds(signal),
  });
}

export function useAdminOnboardingSolutions() {
  return useQuery({
    queryKey: onboardingQueryKeys.adminSolutions,
    queryFn: ({ signal }) => onboardingService.adminSolutions(signal),
  });
}

export function useAdminOnboardingMappings() {
  return useQuery({
    queryKey: onboardingQueryKeys.adminMappings,
    queryFn: ({ signal }) => onboardingService.adminMappings(signal),
  });
}

export function useSaveOnboardingQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; body: UpsertOnboardingQuestionRequest }) =>
      input.id
        ? onboardingService.updateQuestion(input.id, input.body)
        : onboardingService.createQuestion(input.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingQueryKeys.adminQuestions });
      void queryClient.invalidateQueries({ queryKey: onboardingQueryKeys.catalog });
    },
  });
}

export function useDeactivateOnboardingQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => onboardingService.deactivateQuestion(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingQueryKeys.adminQuestions });
      void queryClient.invalidateQueries({ queryKey: onboardingQueryKeys.catalog });
    },
  });
}

export function useSaveOnboardingNeed(kind: 'need' | 'solution') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; body: UpsertOnboardingNeedRequest }) => {
      if (kind === 'need') {
        return input.id
          ? onboardingService.updateNeed(input.id, input.body)
          : onboardingService.createNeed(input.body);
      }
      return input.id
        ? onboardingService.updateSolution(input.id, input.body)
        : onboardingService.createSolution(input.body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: kind === 'need' ? onboardingQueryKeys.adminNeeds : onboardingQueryKeys.adminSolutions,
      });
    },
  });
}

export function useDeactivateOnboardingNeed(kind: 'need' | 'solution') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      kind === 'need' ? onboardingService.deactivateNeed(id) : onboardingService.deactivateSolution(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: kind === 'need' ? onboardingQueryKeys.adminNeeds : onboardingQueryKeys.adminSolutions,
      });
    },
  });
}

export function useSaveOnboardingMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertOnboardingMappingRequest) => onboardingService.createMapping(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingQueryKeys.adminMappings });
    },
  });
}

export function useDeleteOnboardingMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => onboardingService.deleteMapping(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingQueryKeys.adminMappings });
    },
  });
}
