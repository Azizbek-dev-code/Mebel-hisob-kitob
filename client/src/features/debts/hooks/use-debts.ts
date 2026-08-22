import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { AddPaymentRequest, DebtListQuery } from '@furniture-erp/shared';

import { customersKeys } from '@/features/customers/hooks/use-customers';
import { financialSummaryQueryKeys } from '@/features/dashboard/hooks/use-financial-summary';
import { salesKeys } from '@/features/sales/hooks/use-sales';
import { debtsService } from '@/services/debts.service';

export const debtKeys = {
  all: ['debts'] as const,
  list: (params: DebtListQuery) => [...debtKeys.all, 'list', params] as const,
};

export async function invalidateDebtQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: debtKeys.all }),
    queryClient.invalidateQueries({ queryKey: salesKeys.all }),
    queryClient.invalidateQueries({ queryKey: customersKeys.all }),
    queryClient.invalidateQueries({ queryKey: financialSummaryQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  ]);
}

export function useDebtsList(params: DebtListQuery) {
  return useQuery({
    queryKey: debtKeys.list(params),
    queryFn: ({ signal }) => debtsService.list(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useRecordDebtPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, body }: { saleId: string; body: AddPaymentRequest }) =>
      debtsService.recordPayment(saleId, body),
    onSuccess: async () => {
      await invalidateDebtQueries(queryClient);
    },
  });
}
