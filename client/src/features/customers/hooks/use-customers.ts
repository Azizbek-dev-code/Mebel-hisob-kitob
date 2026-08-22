import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateCustomerCatalogueRequest,
  CustomerListQuery,
  UpdateCustomerRequest,
} from '@furniture-erp/shared';

import { customersService } from '@/services/customers.service';

export const customersKeys = {
  all: ['customers'] as const,
  list: (query: CustomerListQuery) => [...customersKeys.all, 'list', query] as const,
  detail: (id: string) => [...customersKeys.all, 'detail', id] as const,
};

export function useCustomersList(query: CustomerListQuery, enabled = true) {
  return useQuery({
    queryKey: customersKeys.list(query),
    queryFn: ({ signal }) => customersService.list(query, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCustomerDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: customersKeys.detail(id ?? ''),
    queryFn: ({ signal }) => customersService.get(id!, signal),
    enabled: Boolean(id) && enabled,
  });
}

function invalidateCustomers(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: customersKeys.all });
}

export function useCreateCustomerCatalogue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCustomerCatalogueRequest) => customersService.create(body),
    onSuccess: () => invalidateCustomers(queryClient),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCustomerRequest }) =>
      customersService.update(id, body),
    onSuccess: (_data, vars) => {
      invalidateCustomers(queryClient);
      void queryClient.invalidateQueries({ queryKey: customersKeys.detail(vars.id) });
    },
  });
}

export function useArchiveCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersService.archive(id),
    onSuccess: (_data, id) => {
      invalidateCustomers(queryClient);
      void queryClient.invalidateQueries({ queryKey: customersKeys.detail(id) });
    },
  });
}

export function useRestoreCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersService.restore(id),
    onSuccess: (_data, id) => {
      invalidateCustomers(queryClient);
      void queryClient.invalidateQueries({ queryKey: customersKeys.detail(id) });
    },
  });
}
