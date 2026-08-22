import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  AssemblyTaskStatus,
  CreateWorkerRequest,
  ResetWorkerPasswordRequest,
  UpdateWorkerRequest,
  WorkerListQuery,
  WorkerResponsibility,
} from '@furniture-erp/shared';

import { workersService } from '@/services/workers.service';

export const workerKeys = {
  all: ['workers'] as const,
  list: (params: WorkerListQuery) => [...workerKeys.all, 'list', params] as const,
  detail: (id: string) => [...workerKeys.all, 'detail', id] as const,
  stats: (id: string) => [...workerKeys.all, 'stats', id] as const,
  sales: (id: string, params: object) => [...workerKeys.all, 'sales', id, params] as const,
  tasks: (id: string, status?: AssemblyTaskStatus) =>
    [...workerKeys.all, 'tasks', id, status ?? 'all'] as const,
  activity: (id: string) => [...workerKeys.all, 'activity', id] as const,
  meProfile: ['me', 'profile'] as const,
  meStats: ['me', 'stats'] as const,
  meSales: (params: object) => ['me', 'sales', params] as const,
  meActivity: ['me', 'activity'] as const,
};

export function useWorkersList(params: WorkerListQuery) {
  return useQuery({
    queryKey: workerKeys.list(params),
    queryFn: ({ signal }) => workersService.list(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useWorker(id: string | undefined) {
  return useQuery({
    queryKey: workerKeys.detail(id ?? ''),
    queryFn: ({ signal }) => workersService.get(id!, signal),
    enabled: Boolean(id),
  });
}

export function useWorkerStats(id: string | undefined) {
  return useQuery({
    queryKey: workerKeys.stats(id ?? ''),
    queryFn: ({ signal }) => workersService.stats(id!, signal),
    enabled: Boolean(id),
  });
}

export function useWorkerSales(
  id: string | undefined,
  params: { page?: number; pageSize?: number; search?: string; from?: string; to?: string },
) {
  return useQuery({
    queryKey: workerKeys.sales(id ?? '', params),
    queryFn: ({ signal }) => workersService.sales(id!, params, signal),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}

export function useWorkerTasks(id: string | undefined, status?: AssemblyTaskStatus) {
  return useQuery({
    queryKey: workerKeys.tasks(id ?? '', status),
    queryFn: ({ signal }) => workersService.tasks(id!, status, signal),
    enabled: Boolean(id),
  });
}

export function useWorkerActivity(id: string | undefined) {
  return useQuery({
    queryKey: workerKeys.activity(id ?? ''),
    queryFn: ({ signal }) => workersService.activity(id!, signal),
    enabled: Boolean(id),
  });
}

export function useCreateWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWorkerRequest) => workersService.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workerKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['lookups', 'workers'] });
    },
  });
}

export function useUpdateWorker(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateWorkerRequest) => workersService.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workerKeys.all });
      void queryClient.invalidateQueries({ queryKey: workerKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: ['lookups', 'workers'] });
    },
  });
}

export function useResetWorkerPassword(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ResetWorkerPasswordRequest) => workersService.resetPassword(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workerKeys.activity(id) });
    },
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: workerKeys.meProfile,
    queryFn: ({ signal }) => workersService.myProfile(signal),
  });
}

export function useMyStats() {
  return useQuery({
    queryKey: workerKeys.meStats,
    queryFn: ({ signal }) => workersService.myStats(signal),
  });
}

export function useMySales(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: workerKeys.meSales(params),
    queryFn: ({ signal }) => workersService.mySales(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useMyActivity() {
  return useQuery({
    queryKey: workerKeys.meActivity,
    queryFn: ({ signal }) => workersService.myActivity(signal),
  });
}

export type { WorkerResponsibility };
