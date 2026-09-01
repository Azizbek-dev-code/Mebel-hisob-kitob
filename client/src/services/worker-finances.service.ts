import type {
  CreateWorkerFinancialTransactionRequest,
  CreateWorkerFinancialTransactionResponse,
  ReverseWorkerFinancialTransactionResponse,
  WorkerFinancialSummary,
  WorkerFinancialSummaryQuery,
  WorkerFinancialSummaryResponse,
  WorkerFinancialTransaction,
  WorkerFinancialTransactionDetailResponse,
  WorkerFinancialTransactionListQuery,
  WorkerFinancialTransactionListResponse,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

/**
 * Admin worker financial ledger API.
 * storeId / createdById are never sent — the session determines them.
 */
export const workerFinancesService = {
  async createTransaction(
    body: CreateWorkerFinancialTransactionRequest,
  ): Promise<WorkerFinancialTransaction> {
    const { transaction } = await apiClient.post<CreateWorkerFinancialTransactionResponse>(
      '/worker-finances/transactions',
      { body },
    );
    return transaction;
  },

  /**
   * Creates an offsetting REVERSAL for an existing ledger row.
   * Does not send amount/workerId/storeId — backend owns accounting + auth.
   */
  async reverseTransaction(
    transactionId: string,
  ): Promise<ReverseWorkerFinancialTransactionResponse> {
    return apiClient.post<ReverseWorkerFinancialTransactionResponse>(
      `/worker-finances/transactions/${transactionId}/reverse`,
      { body: {} },
    );
  },

  async listTransactions(
    workerId: string,
    params: WorkerFinancialTransactionListQuery = {},
    signal?: AbortSignal,
  ): Promise<WorkerFinancialTransactionListResponse> {
    return apiClient.get<WorkerFinancialTransactionListResponse>(
      `/worker-finances/workers/${workerId}/transactions`,
      {
        searchParams: {
          page: params.page,
          pageSize: params.pageSize,
          type: params.type,
          from: params.from,
          to: params.to,
          search: params.search,
        },
        signal,
      },
    );
  },

  async getSummary(
    workerId: string,
    params: WorkerFinancialSummaryQuery = {},
    signal?: AbortSignal,
  ): Promise<WorkerFinancialSummary> {
    const { summary } = await apiClient.get<WorkerFinancialSummaryResponse>(
      `/worker-finances/workers/${workerId}/summary`,
      {
        searchParams: {
          from: params.from,
          to: params.to,
        },
        signal,
      },
    );
    return summary;
  },

  async getTransaction(
    transactionId: string,
    signal?: AbortSignal,
  ): Promise<WorkerFinancialTransaction> {
    const { transaction } = await apiClient.get<WorkerFinancialTransactionDetailResponse>(
      `/worker-finances/transactions/${transactionId}`,
      { signal },
    );
    return transaction;
  },

  /** Read-only self ledger summary (`/me/finances/summary`). */
  async mySummary(
    params: WorkerFinancialSummaryQuery = {},
    signal?: AbortSignal,
  ): Promise<WorkerFinancialSummary> {
    const { summary } = await apiClient.get<WorkerFinancialSummaryResponse>(
      '/me/finances/summary',
      {
        searchParams: {
          from: params.from,
          to: params.to,
        },
        signal,
      },
    );
    return summary;
  },

  /** Read-only self ledger transactions (`/me/finances/transactions`). */
  async myTransactions(
    params: WorkerFinancialTransactionListQuery = {},
    signal?: AbortSignal,
  ): Promise<WorkerFinancialTransactionListResponse> {
    return apiClient.get<WorkerFinancialTransactionListResponse>('/me/finances/transactions', {
      searchParams: {
        page: params.page,
        pageSize: params.pageSize,
        type: params.type,
        from: params.from,
        to: params.to,
        search: params.search,
      },
      signal,
    });
  },
};
