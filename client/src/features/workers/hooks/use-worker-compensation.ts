import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateWorkerCompensationRuleRequest,
  SettleWorkerCompensationRequest,
  UpdateWorkerCompensationRuleRequest,
} from '@furniture-erp/shared';

import { workerFinanceKeys } from '@/features/workers/hooks/use-worker-finances';
import { workerCompensationService } from '@/services/worker-compensation.service';

export const workerCompensationKeys = {
  all: ['worker-compensation'] as const,
  lists: () => [...workerCompensationKeys.all, 'list'] as const,
  list: (workerId: string, params: { isActive?: boolean } = {}) =>
    [...workerCompensationKeys.lists(), workerId, params] as const,
  detail: (workerId: string, ruleId: string) =>
    [...workerCompensationKeys.all, 'detail', workerId, ruleId] as const,
  preview: (workerId: string, params: { from: string; to: string }) =>
    [...workerCompensationKeys.all, 'preview', workerId, params] as const,
};

export function useWorkerCompensationRules(
  workerId: string,
  params: { isActive?: boolean } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: workerCompensationKeys.list(workerId, params),
    queryFn: ({ signal }) => workerCompensationService.listRules(workerId, params, signal),
    enabled: Boolean(workerId) && enabled,
  });
}

export function useWorkerCompensationPreview(
  workerId: string,
  params: { from: string; to: string } | null,
  enabled = true,
) {
  return useQuery({
    queryKey: workerCompensationKeys.preview(workerId, params ?? { from: '', to: '' }),
    queryFn: ({ signal }) => {
      if (!params) throw new Error('Preview period is required');
      return workerCompensationService.getPreview(workerId, params, signal);
    },
    enabled: Boolean(workerId) && Boolean(params?.from && params?.to) && enabled,
  });
}

export function useCreateWorkerCompensationRule(workerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateWorkerCompensationRuleRequest) =>
      workerCompensationService.createRule(workerId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workerCompensationKeys.lists(),
      });
    },
  });
}

export function useUpdateWorkerCompensationRule(workerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ruleId,
      body,
    }: {
      ruleId: string;
      body: UpdateWorkerCompensationRuleRequest;
    }) => workerCompensationService.updateRule(workerId, ruleId, body),
    onSuccess: async (_rule, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: workerCompensationKeys.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: workerCompensationKeys.detail(workerId, variables.ruleId),
        }),
      ]);
    },
  });
}

export function useSettleWorkerCompensation(workerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SettleWorkerCompensationRequest) =>
      workerCompensationService.settle(workerId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workerCompensationKeys.all }),
        queryClient.invalidateQueries({ queryKey: workerFinanceKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}
