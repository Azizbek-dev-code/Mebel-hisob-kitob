import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateProductCategoryRequest,
  CreateProductRequest,
  ProductListQuery,
  UpdateProductCategoryRequest,
  UpdateProductRequest,
} from '@furniture-erp/shared';

import { productsService } from '@/services/products.service';
import { inventoryKeys } from '@/features/inventory/hooks/use-inventory';

export const productsKeys = {
  all: ['products'] as const,
  list: (query: ProductListQuery) => [...productsKeys.all, 'list', query] as const,
  detail: (id: string) => [...productsKeys.all, 'detail', id] as const,
  categories: (includeInactive: boolean) =>
    [...productsKeys.all, 'categories', includeInactive] as const,
};

export function useProductsList(query: ProductListQuery, enabled = true) {
  return useQuery({
    queryKey: productsKeys.list(query),
    queryFn: ({ signal }) => productsService.list(query, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useProductDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: productsKeys.detail(id ?? ''),
    queryFn: ({ signal }) => productsService.get(id!, signal),
    enabled: Boolean(id) && enabled,
  });
}

export function useProductCategories(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: productsKeys.categories(includeInactive),
    queryFn: ({ signal }) => productsService.listCategories({ includeInactive }, signal),
    enabled,
  });
}

function invalidateCatalogue(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: productsKeys.all });
  void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  // Sale-form product SearchSelect uses lookups/products — keep it in sync after CRUD.
  void queryClient.invalidateQueries({ queryKey: ['lookups', 'products'] });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductRequest) => productsService.create(body),
    onSuccess: () => invalidateCatalogue(queryClient),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProductRequest }) =>
      productsService.update(id, body),
    onSuccess: (_data, vars) => {
      invalidateCatalogue(queryClient);
      void queryClient.invalidateQueries({ queryKey: productsKeys.detail(vars.id) });
    },
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsService.archive(id),
    onSuccess: (_data, id) => {
      invalidateCatalogue(queryClient);
      void queryClient.invalidateQueries({ queryKey: productsKeys.detail(id) });
    },
  });
}

export function useRestoreProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsService.restore(id),
    onSuccess: (_data, id) => {
      invalidateCatalogue(queryClient);
      void queryClient.invalidateQueries({ queryKey: productsKeys.detail(id) });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsService.deletePermanent(id),
    onSuccess: (_data, id) => {
      invalidateCatalogue(queryClient);
      void queryClient.removeQueries({ queryKey: productsKeys.detail(id) });
    },
  });
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      productsService.uploadImage(id, file),
    onSuccess: (_data, vars) => {
      invalidateCatalogue(queryClient);
      void queryClient.invalidateQueries({ queryKey: productsKeys.detail(vars.id) });
    },
  });
}

export function useRemoveProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsService.removeImage(id),
    onSuccess: (_data, id) => {
      invalidateCatalogue(queryClient);
      void queryClient.invalidateQueries({ queryKey: productsKeys.detail(id) });
    },
  });
}

export function useCreateProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductCategoryRequest) => productsService.createCategory(body),
    onSuccess: () => invalidateCatalogue(queryClient),
  });
}

export function useUpdateProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProductCategoryRequest }) =>
      productsService.updateCategory(id, body),
    onSuccess: () => invalidateCatalogue(queryClient),
  });
}

export function useDeactivateProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsService.deactivateCategory(id),
    onSuccess: () => invalidateCatalogue(queryClient),
  });
}
