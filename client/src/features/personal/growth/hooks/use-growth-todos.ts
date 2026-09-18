import type {
  CreateGrowthTodoRequest,
  UpdateGrowthTodoRequest,
} from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalGrowthTodoService } from '@/services/personal-growth-todo.service';

export const personalGrowthTodoKeys = {
  all: ['personal', 'growth', 'todos'] as const,
  list: (status?: string) => [...personalGrowthTodoKeys.all, 'list', status ?? 'all'] as const,
  today: () => [...personalGrowthTodoKeys.all, 'today'] as const,
};

function invalidateTodos(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: personalGrowthTodoKeys.all });
  void queryClient.invalidateQueries({ queryKey: ['personal'] });
}

export function useGrowthTodos(status?: string) {
  return useQuery({
    queryKey: personalGrowthTodoKeys.list(status),
    queryFn: ({ signal }) => personalGrowthTodoService.list(status, signal),
  });
}

export function useTodayGrowthTodos() {
  return useQuery({
    queryKey: personalGrowthTodoKeys.today(),
    queryFn: ({ signal }) => personalGrowthTodoService.today(signal),
  });
}

export function useCreateGrowthTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGrowthTodoRequest) => personalGrowthTodoService.create(body),
    onSuccess: () => invalidateTodos(queryClient),
  });
}

export function useUpdateGrowthTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateGrowthTodoRequest }) =>
      personalGrowthTodoService.update(id, body),
    onSuccess: () => invalidateTodos(queryClient),
  });
}
