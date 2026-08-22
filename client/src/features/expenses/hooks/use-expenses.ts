import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type {
  CancelExpenseRequest,
  CreateExpenseRequest,
  ExpenseListQuery,
  UpdateExpenseRequest,
} from '@furniture-erp/shared';

import { expenseAnalyticsQueryKeys } from '@/features/dashboard/hooks/use-expense-analytics';
import { financialSummaryQueryKeys } from '@/features/dashboard/hooks/use-financial-summary';
import { financialTrendQueryKeys } from '@/features/dashboard/hooks/use-financial-trend';
import { expensesService } from '@/services/expenses.service';

export const expenseKeys = {
  all: ['expenses'] as const,
  list: (params: ExpenseListQuery) => [...expenseKeys.all, 'list', params] as const,
  detail: (id: string) => [...expenseKeys.all, 'detail', id] as const,
  categories: [...(['expenses'] as const), 'categories'] as const,
};

/** Targeted invalidation after expense create/update/cancel. */
export async function invalidateExpenseQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: expenseKeys.all }),
    queryClient.invalidateQueries({ queryKey: financialSummaryQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: expenseAnalyticsQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: financialTrendQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  ]);
}

export function useExpensesList(params: ExpenseListQuery) {
  return useQuery({
    queryKey: expenseKeys.list(params),
    queryFn: ({ signal }) => expensesService.list(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useExpenseCategories(enabled = true) {
  return useQuery({
    queryKey: expenseKeys.categories,
    queryFn: ({ signal }) => expensesService.listCategories(signal),
    enabled,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateExpenseRequest) => expensesService.create(body),
    onSuccess: async () => {
      await invalidateExpenseQueries(queryClient);
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateExpenseRequest }) =>
      expensesService.update(id, body),
    onSuccess: async () => {
      await invalidateExpenseQueries(queryClient);
    },
  });
}

export function useCancelExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CancelExpenseRequest }) =>
      expensesService.cancel(id, body),
    onSuccess: async () => {
      await invalidateExpenseQueries(queryClient);
    },
  });
}
