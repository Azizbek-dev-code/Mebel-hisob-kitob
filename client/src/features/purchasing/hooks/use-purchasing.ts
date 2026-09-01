import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CancelPurchaseRequest,
  CreatePurchaseRequest,
  CreateSupplierPaymentRequest,
  CreateSupplierRequest,
  PurchaseListQuery,
  SupplierListQuery,
  UpdatePurchaseDeliveryRequest,
  UpdateSupplierRequest,
} from '@furniture-erp/shared';

import { inventoryKeys } from '@/features/inventory/hooks/use-inventory';
import { lookupsService } from '@/services/lookups.service';
import { purchasingService } from '@/services/purchasing.service';

export const purchasingKeys = {
  all: ['purchasing'] as const,
  suppliers: ['purchasing', 'suppliers'] as const,
  supplierList: (query: SupplierListQuery) =>
    [...purchasingKeys.suppliers, 'list', query] as const,
  supplierDetail: (id: string) => [...purchasingKeys.suppliers, 'detail', id] as const,
  purchases: ['purchasing', 'purchases'] as const,
  purchaseList: (query: PurchaseListQuery) =>
    [...purchasingKeys.purchases, 'list', query] as const,
  purchaseDetail: (id: string) => [...purchasingKeys.purchases, 'detail', id] as const,
  products: (q: string) => ['lookups', 'products', q] as const,
};

export function useSuppliersList(query: SupplierListQuery, enabled = true) {
  return useQuery({
    queryKey: purchasingKeys.supplierList(query),
    queryFn: ({ signal }) => purchasingService.listSuppliers(query, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useSupplierDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: purchasingKeys.supplierDetail(id ?? ''),
    queryFn: ({ signal }) => purchasingService.getSupplier(id!, signal),
    enabled: Boolean(id) && enabled,
  });
}

export function usePurchasesList(query: PurchaseListQuery, enabled = true) {
  return useQuery({
    queryKey: purchasingKeys.purchaseList(query),
    queryFn: ({ signal }) => purchasingService.listPurchases(query, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function usePurchaseDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: purchasingKeys.purchaseDetail(id ?? ''),
    queryFn: ({ signal }) => purchasingService.getPurchase(id!, signal),
    enabled: Boolean(id) && enabled,
  });
}

export function useProductLookup(query: string) {
  return useQuery({
    queryKey: purchasingKeys.products(query),
    queryFn: ({ signal }) => lookupsService.products(query, signal),
  });
}

function invalidateSuppliers(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: purchasingKeys.suppliers });
}

function invalidatePurchases(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: purchasingKeys.purchases });
  invalidateSuppliers(queryClient);
}

/** Purchases change on-hand stock — keep catalogue / inventory / lookups in sync. */
function invalidateStockSurfaces(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  void queryClient.invalidateQueries({ queryKey: ['products'] });
  void queryClient.invalidateQueries({ queryKey: ['lookups', 'products'] });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSupplierRequest) => purchasingService.createSupplier(body),
    onSuccess: () => invalidateSuppliers(queryClient),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSupplierRequest }) =>
      purchasingService.updateSupplier(id, body),
    onSuccess: (_data, vars) => {
      invalidateSuppliers(queryClient);
      void queryClient.invalidateQueries({
        queryKey: purchasingKeys.supplierDetail(vars.id),
      });
    },
  });
}

export function useArchiveSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchasingService.archiveSupplier(id),
    onSuccess: (_data, id) => {
      invalidateSuppliers(queryClient);
      void queryClient.invalidateQueries({ queryKey: purchasingKeys.supplierDetail(id) });
    },
  });
}

export function useRestoreSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchasingService.restoreSupplier(id),
    onSuccess: (_data, id) => {
      invalidateSuppliers(queryClient);
      void queryClient.invalidateQueries({ queryKey: purchasingKeys.supplierDetail(id) });
    },
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePurchaseRequest) => purchasingService.createPurchase(body),
    onSuccess: () => {
      invalidatePurchases(queryClient);
      invalidateStockSurfaces(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useUpdatePurchaseDelivery(purchaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePurchaseDeliveryRequest) =>
      purchasingService.updatePurchaseDelivery(purchaseId, body),
    onSuccess: () => {
      invalidatePurchases(queryClient);
      void queryClient.invalidateQueries({
        queryKey: purchasingKeys.purchaseDetail(purchaseId),
      });
    },
  });
}

export function useAddSupplierPayment(purchaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSupplierPaymentRequest) =>
      purchasingService.addPayment(purchaseId, body),
    onSuccess: () => {
      invalidatePurchases(queryClient);
      void queryClient.invalidateQueries({
        queryKey: purchasingKeys.purchaseDetail(purchaseId),
      });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useCancelPurchase(purchaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CancelPurchaseRequest) =>
      purchasingService.cancelPurchase(purchaseId, body),
    onSuccess: () => {
      invalidatePurchases(queryClient);
      invalidateStockSurfaces(queryClient);
      void queryClient.invalidateQueries({
        queryKey: purchasingKeys.purchaseDetail(purchaseId),
      });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
