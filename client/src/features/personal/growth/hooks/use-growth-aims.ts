import type { CreateGrowthAimRequest, UpdateGrowthAimRequest } from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalGrowthAimsService } from '@/services/personal-growth-aims.service';

export const personalGrowthAimKeys = {
  all: ['personal', 'growth', 'aims'] as const,
};

export function useGrowthAims() {
  return useQuery({
    queryKey: personalGrowthAimKeys.all,
    queryFn: ({ signal }) => personalGrowthAimsService.list(signal),
  });
}

export function useCreateGrowthAim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGrowthAimRequest) => personalGrowthAimsService.create(body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: personalGrowthAimKeys.all }),
  });
}

export function useUpdateGrowthAim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateGrowthAimRequest }) =>
      personalGrowthAimsService.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: personalGrowthAimKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['personal', 'growth', 'xp'] });
    },
  });
}
