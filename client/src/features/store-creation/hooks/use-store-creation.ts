import {
  StoreCreationRequestStatus,
  type CreateStoreRequestBody,
  type StoreCreationRequestListQuery,
} from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { storeCreationService } from '@/services/store-creation.service';

export const storeCreationQueryKeys = {
  all: ['store-creation'] as const,
  public: (id: string) => ['store-creation', 'public', id] as const,
  list: (query: StoreCreationRequestListQuery) => ['store-creation', 'list', query] as const,
  detail: (id: string) => ['store-creation', 'detail', id] as const,
  summary: ['store-creation', 'summary'] as const,
};

export function useCreateStoreRequest() {
  return useMutation({
    mutationFn: (body: CreateStoreRequestBody) => storeCreationService.create(body),
  });
}

export function usePublicStoreRequest(id: string | undefined) {
  return useQuery({
    queryKey: storeCreationQueryKeys.public(id ?? ''),
    queryFn: ({ signal }) => storeCreationService.getPublic(id!, signal),
    enabled: Boolean(id),
  });
}

export function useStoreRequestList(query: StoreCreationRequestListQuery, enabled = true) {
  return useQuery({
    queryKey: storeCreationQueryKeys.list(query),
    queryFn: ({ signal }) => storeCreationService.list(query, signal),
    enabled,
  });
}

export function useStoreRequestDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: storeCreationQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => storeCreationService.get(id!, signal),
    enabled: Boolean(id) && enabled,
  });
}

export function usePendingStoreRequestCount(enabled = true) {
  return useQuery({
    queryKey: storeCreationQueryKeys.summary,
    queryFn: ({ signal }) => storeCreationService.summary(signal),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useApproveStoreRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => storeCreationService.approve(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeCreationQueryKeys.all });
    },
  });
}

export function useRejectStoreRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      storeCreationService.reject(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeCreationQueryKeys.all });
    },
  });
}

export { StoreCreationRequestStatus };
