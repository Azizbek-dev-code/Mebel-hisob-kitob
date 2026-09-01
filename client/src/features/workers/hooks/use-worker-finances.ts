import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CreateWorkerFinancialTransactionRequest,
  WorkerFinancialSummaryQuery,
  WorkerFinancialTransactionListQuery,
} from '@furniture-erp/shared';

import { workerFinancesService } from '@/services/worker-finances.service';

export const workerFinanceKeys = {
  all: ['worker-finances'] as const,
  summary: (workerId: string, params: WorkerFinancialSummaryQuery) =>
    [...workerFinanceKeys.all, 'summary', workerId, params] as const,
  transactions: (workerId: string, params: WorkerFinancialTransactionListQuery) =>
    [...workerFinanceKeys.all, 'transactions', workerId, params] as const,
  detail: (transactionId: string) =>
    [...workerFinanceKeys.all, 'detail', transactionId] as const,
  meSummary: (params: WorkerFinancialSummaryQuery) =>
    [...workerFinanceKeys.all, 'me-summary', params] as const,
  meTransactions: (params: WorkerFinancialTransactionListQuery) =>
    [...workerFinanceKeys.all, 'me-transactions', params] as const,
};

export function useWorkerFinanceSummary(
  workerId: string,
  params: WorkerFinancialSummaryQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: workerFinanceKeys.summary(workerId, params),
    queryFn: ({ signal }) => workerFinancesService.getSummary(workerId, params, signal),
    enabled: Boolean(workerId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useWorkerFinanceTransactions(
  workerId: string,
  params: WorkerFinancialTransactionListQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: workerFinanceKeys.transactions(workerId, params),
    queryFn: ({ signal }) => workerFinancesService.listTransactions(workerId, params, signal),
    enabled: Boolean(workerId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useMyFinanceSummary(params: WorkerFinancialSummaryQuery, enabled = true) {
  return useQuery({
    queryKey: workerFinanceKeys.meSummary(params),
    queryFn: ({ signal }) => workerFinancesService.mySummary(params, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useMyFinanceTransactions(
  params: WorkerFinancialTransactionListQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: workerFinanceKeys.meTransactions(params),
    queryFn: ({ signal }) => workerFinancesService.myTransactions(params, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** Create a ledger row; invalidates summary + list for this worker feature only. */
export function useCreateWorkerFinancialTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateWorkerFinancialTransactionRequest) =>
      workerFinancesService.createTransaction(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workerFinanceKeys.all });
    },
  });
}

/** Offset an existing row with a REVERSAL; server remains authoritative for amounts. */
export function useReverseWorkerFinancialTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) =>
      workerFinancesService.reverseTransaction(transactionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workerFinanceKeys.all });
    },
  });
}
