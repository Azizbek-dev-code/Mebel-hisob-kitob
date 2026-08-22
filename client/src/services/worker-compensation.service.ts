import type {
  CreateWorkerCompensationRuleRequest,
  CreateWorkerCompensationRuleResponse,
  SettleWorkerCompensationRequest,
  SettleWorkerCompensationResponse,
  SettleWorkerCompensationResult,
  UpdateWorkerCompensationRuleRequest,
  UpdateWorkerCompensationRuleResponse,
  WorkerCompensationPreview,
  WorkerCompensationPreviewResponse,
  WorkerCompensationRule,
  WorkerCompensationRuleDetailResponse,
  WorkerCompensationRuleListResponse,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

/**
 * Admin worker compensation-rule API (configuration + preview + settle).
 * storeId / createdById are never sent — the session determines them.
 * Creating/updating a rule or loading a preview must never create
 * WorkerFinancialTransaction rows. Settle posts COMMISSION rows.
 */
export const workerCompensationService = {
  async listRules(
    workerId: string,
    params: { isActive?: boolean } = {},
    signal?: AbortSignal,
  ): Promise<WorkerCompensationRule[]> {
    const { items } = await apiClient.get<WorkerCompensationRuleListResponse>(
      `/workers/${workerId}/compensation-rules`,
      {
        searchParams: {
          isActive: params.isActive,
        },
        signal,
      },
    );
    return items;
  },

  async getRule(
    workerId: string,
    ruleId: string,
    signal?: AbortSignal,
  ): Promise<WorkerCompensationRule> {
    const { rule } = await apiClient.get<WorkerCompensationRuleDetailResponse>(
      `/workers/${workerId}/compensation-rules/${ruleId}`,
      { signal },
    );
    return rule;
  },

  async createRule(
    workerId: string,
    body: CreateWorkerCompensationRuleRequest,
  ): Promise<WorkerCompensationRule> {
    const { rule } = await apiClient.post<CreateWorkerCompensationRuleResponse>(
      `/workers/${workerId}/compensation-rules`,
      { body },
    );
    return rule;
  },

  async updateRule(
    workerId: string,
    ruleId: string,
    body: UpdateWorkerCompensationRuleRequest,
  ): Promise<WorkerCompensationRule> {
    const { rule } = await apiClient.patch<UpdateWorkerCompensationRuleResponse>(
      `/workers/${workerId}/compensation-rules/${ruleId}`,
      { body },
    );
    return rule;
  },

  async getPreview(
    workerId: string,
    params: { from: string; to: string },
    signal?: AbortSignal,
  ): Promise<WorkerCompensationPreview> {
    const { preview } = await apiClient.get<WorkerCompensationPreviewResponse>(
      `/workers/${workerId}/compensation-preview`,
      {
        searchParams: {
          from: params.from,
          to: params.to,
        },
        signal,
      },
    );
    return preview;
  },

  async settle(
    workerId: string,
    body: SettleWorkerCompensationRequest,
  ): Promise<SettleWorkerCompensationResult> {
    const { settlement } = await apiClient.post<SettleWorkerCompensationResponse>(
      `/workers/${workerId}/compensation-settle`,
      { body },
    );
    return settlement;
  },
};
