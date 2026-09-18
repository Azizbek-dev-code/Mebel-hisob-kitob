import type {
  CompleteGrowthFocusRequest,
  StartGrowthFocusRequest,
} from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalGrowthFocusService } from '@/services/personal-growth-focus.service';
import { personalGrowthTodoKeys } from '@/features/personal/growth/hooks/use-growth-todos';

export const personalGrowthFocusKeys = {
  all: ['personal', 'growth', 'focus'] as const,
  stats: () => [...personalGrowthFocusKeys.all, 'stats'] as const,
  active: () => [...personalGrowthFocusKeys.all, 'active'] as const,
};

function invalidateFocus(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: personalGrowthFocusKeys.all });
  void queryClient.invalidateQueries({ queryKey: personalGrowthTodoKeys.all });
  void queryClient.invalidateQueries({ queryKey: ['personal'] });
}

export function useGrowthFocusStats() {
  return useQuery({
    queryKey: personalGrowthFocusKeys.stats(),
    queryFn: ({ signal }) => personalGrowthFocusService.stats(signal),
    refetchInterval: (query) => (query.state.data?.stats.activeSession ? 1000 : 30_000),
  });
}

export function useStartGrowthFocus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StartGrowthFocusRequest) => personalGrowthFocusService.start(body),
    onSuccess: () => invalidateFocus(queryClient),
  });
}

export function useCompleteGrowthFocus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: CompleteGrowthFocusRequest }) =>
      personalGrowthFocusService.complete(id, body ?? {}),
    onSuccess: () => invalidateFocus(queryClient),
  });
}
