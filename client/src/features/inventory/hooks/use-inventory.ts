import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type {
  InventoryListQuery,
  StockAdjustRequest,
  StockHistoryQuery,
  StockInRequest,
  StockOutRequest,
} from '@furniture-erp/shared';

import { inventoryService } from '@/services/inventory.service';

export const inventoryKeys = {
  all: ['inventory'] as const,
  list: (params: InventoryListQuery) => [...inventoryKeys.all, 'list', params] as const,
  product: (id: string) => [...inventoryKeys.all, 'product', id] as const,
  history: (params: StockHistoryQuery) => [...inventoryKeys.all, 'history', params] as const,
};

export async function invalidateInventoryQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
    // String prefixes avoid a circular import with products hooks.
    queryClient.invalidateQueries({ queryKey: ['products'] }),
    queryClient.invalidateQueries({ queryKey: ['lookups', 'products'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['reports'] }),
  ]);
}

export function useInventoryList(params: InventoryListQuery) {
  return useQuery({
    queryKey: inventoryKeys.list(params),
    queryFn: ({ signal }) => inventoryService.list(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useInventoryProduct(id: string | null) {
  return useQuery({
    queryKey: inventoryKeys.product(id ?? ''),
    queryFn: ({ signal }) => inventoryService.getProduct(id!, signal),
    enabled: Boolean(id),
  });
}

export function useStockHistory(params: StockHistoryQuery) {
  return useQuery({
    queryKey: inventoryKeys.history(params),
    queryFn: ({ signal }) => inventoryService.history(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useStockIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StockInRequest) => inventoryService.stockIn(body),
    onSuccess: async () => {
      await invalidateInventoryQueries(queryClient);
    },
  });
}

export function useStockOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StockOutRequest) => inventoryService.stockOut(body),
    onSuccess: async () => {
      await invalidateInventoryQueries(queryClient);
    },
  });
}

export function useStockAdjust() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StockAdjustRequest) => inventoryService.adjust(body),
    onSuccess: async () => {
      await invalidateInventoryQueries(queryClient);
    },
  });
}
