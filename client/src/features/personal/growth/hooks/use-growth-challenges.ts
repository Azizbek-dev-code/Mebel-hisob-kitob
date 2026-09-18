import type { CreateGrowthChallengeRequest } from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalGrowthChallengesService } from '@/services/personal-growth-challenges.service';

export const personalGrowthChallengesKeys = {
  all: ['personal', 'growth', 'challenges'] as const,
  list: () => [...personalGrowthChallengesKeys.all, 'list'] as const,
};

function invalidateChallenges(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: personalGrowthChallengesKeys.all });
}

export function useGrowthChallenges() {
  return useQuery({
    queryKey: personalGrowthChallengesKeys.list(),
    queryFn: ({ signal }) => personalGrowthChallengesService.list(signal),
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGrowthChallengeRequest) =>
      personalGrowthChallengesService.create(body),
    onSuccess: () => invalidateChallenges(queryClient),
  });
}

export function useAcceptChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => personalGrowthChallengesService.accept(id),
    onSuccess: () => invalidateChallenges(queryClient),
  });
}

export function useDeclineChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => personalGrowthChallengesService.decline(id),
    onSuccess: () => invalidateChallenges(queryClient),
  });
}

export function useCancelChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => personalGrowthChallengesService.cancel(id),
    onSuccess: () => invalidateChallenges(queryClient),
  });
}
