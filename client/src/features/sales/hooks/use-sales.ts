import type {
  AddPaymentRequest,
  AssemblyTaskStatus,
  CancelSaleRequest,
  CreateSaleRequest,
  SaleListQuery,
  UpdateAssemblyTaskRequest,
  UpdateSaleRequest,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { customersKeys } from '@/features/customers/hooks/use-customers';
import { financialSummaryQueryKeys } from '@/features/dashboard/hooks/use-financial-summary';
import { inventoryKeys } from '@/features/inventory/hooks/use-inventory';
import { productsKeys } from '@/features/products/hooks/use-products';
import { lookupsService } from '@/services/lookups.service';
import { salesService } from '@/services/sales.service';

export const salesKeys = {
  all: ['sales'] as const,
  list: (params: SaleListQuery) => [...salesKeys.all, 'list', params] as const,
  detail: (id: string) => [...salesKeys.all, 'detail', id] as const,
  assemblyMine: (status?: string) => ['assembly-tasks', 'mine', status ?? 'all'] as const,
  customers: (q: string) => ['lookups', 'customers', q] as const,
  products: (q: string) => ['lookups', 'products', q] as const,
  workers: (q: string, responsibility?: WorkerResponsibility) =>
    ['lookups', 'workers', q, responsibility ?? 'all'] as const,
};

/**
 * After a sale mutates money or stock, refresh every surface that can look
 * "unsaved" if left stale (list/detail, inventory, customer debt, dashboard).
 * Uses string prefixes for debts/reports to avoid a cycle with those hooks.
 */
export async function invalidateAfterSaleMutation(
  queryClient: QueryClient,
  options: { saleId?: string; stockChanged?: boolean } = {},
): Promise<void> {
  const tasks: Array<Promise<unknown>> = [
    queryClient.invalidateQueries({ queryKey: salesKeys.all }),
    queryClient.invalidateQueries({ queryKey: customersKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['debts'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: financialSummaryQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['reports'] }),
    queryClient.invalidateQueries({ queryKey: ['worker-compensation'] }),
  ];

  if (options.saleId) {
    tasks.push(queryClient.invalidateQueries({ queryKey: salesKeys.detail(options.saleId) }));
  }

  if (options.stockChanged) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
      queryClient.invalidateQueries({ queryKey: productsKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['lookups', 'products'] }),
    );
  }

  await Promise.all(tasks);
}

export function useSalesList(params: SaleListQuery) {
  return useQuery({
    queryKey: salesKeys.list(params),
    queryFn: ({ signal }) => salesService.list(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useSale(id: string | undefined) {
  return useQuery({
    queryKey: salesKeys.detail(id ?? ''),
    queryFn: ({ signal }) => salesService.get(id!, signal),
    enabled: Boolean(id),
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSaleRequest) => salesService.create(body),
    onSuccess: async (sale) => {
      await invalidateAfterSaleMutation(queryClient, {
        saleId: sale.id,
        stockChanged: true,
      });
    },
  });
}

export function useAddPayment(saleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddPaymentRequest) => salesService.addPayment(saleId, body),
    onSuccess: async () => {
      await invalidateAfterSaleMutation(queryClient, { saleId });
    },
  });
}

export function useCancelSale(saleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CancelSaleRequest) => salesService.cancel(saleId, body),
    onSuccess: async () => {
      await invalidateAfterSaleMutation(queryClient, {
        saleId,
        stockChanged: true,
      });
    },
  });
}

export function useUpdateSale(saleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSaleRequest) => salesService.update(saleId, body),
    onSuccess: async () => {
      await invalidateAfterSaleMutation(queryClient, { saleId });
    },
  });
}

export function useMyAssemblyTasks(status?: AssemblyTaskStatus) {
  return useQuery({
    queryKey: salesKeys.assemblyMine(status),
    queryFn: async ({ signal }) => {
      const items = await salesService.myAssemblyTasks(signal);
      if (!status) return items;
      return items.filter((task) => task.status === status);
    },
  });
}

export function useUpdateAssemblyTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAssemblyTaskRequest }) =>
      salesService.updateAssemblyTask(id, body),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assembly-tasks'] }),
        queryClient.invalidateQueries({ queryKey: salesKeys.detail(result.sale.id) }),
        queryClient.invalidateQueries({ queryKey: salesKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['worker-compensation'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}

export function useCustomerLookup(query: string) {
  return useQuery({
    queryKey: salesKeys.customers(query),
    queryFn: ({ signal }) => lookupsService.customers(query, signal),
  });
}

export function useProductLookup(query: string) {
  return useQuery({
    queryKey: salesKeys.products(query),
    queryFn: ({ signal }) => lookupsService.products(query, signal),
  });
}

export function useWorkerLookup(query = '', responsibility?: WorkerResponsibility) {
  return useQuery({
    queryKey: salesKeys.workers(query, responsibility),
    queryFn: ({ signal }) => lookupsService.workers(query, signal, responsibility),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: lookupsService.createCustomer,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lookups', 'customers'] }),
        queryClient.invalidateQueries({ queryKey: customersKeys.all }),
      ]);
    },
  });
}
