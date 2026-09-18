import type {
  CreateGrowthCalendarEventRequest,
  UpdateGrowthCalendarEventRequest,
} from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalPlanService } from '@/services/personal-plan.service';

export const personalPlanKeys = {
  all: ['personal', 'plan'] as const,
  events: (from: string, to: string) => [...personalPlanKeys.all, 'events', from, to] as const,
  day: (date: string) => [...personalPlanKeys.all, 'day', date] as const,
  reminders: () => [...personalPlanKeys.all, 'reminders'] as const,
};

function invalidatePlan(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: personalPlanKeys.all });
  void queryClient.invalidateQueries({ queryKey: ['personal'] });
}

export function usePersonalPlanEvents(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: personalPlanKeys.events(from, to),
    queryFn: ({ signal }) => personalPlanService.events(from, to, signal),
    enabled: Boolean(from && to && enabled),
  });
}

export function usePersonalPlanDay(date: string, enabled = true) {
  return useQuery({
    queryKey: personalPlanKeys.day(date),
    queryFn: ({ signal }) => personalPlanService.day(date, signal),
    enabled: Boolean(date && enabled),
  });
}

export function usePersonalPlanReminders(withinMinutes = 24 * 60) {
  return useQuery({
    queryKey: personalPlanKeys.reminders(),
    queryFn: ({ signal }) => personalPlanService.reminders(withinMinutes, signal),
  });
}

export function useCreatePersonalPlanEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGrowthCalendarEventRequest) => personalPlanService.createEvent(body),
    onSuccess: () => invalidatePlan(queryClient),
  });
}

export function useUpdatePersonalPlanEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateGrowthCalendarEventRequest }) =>
      personalPlanService.updateEvent(id, body),
    onSuccess: () => invalidatePlan(queryClient),
  });
}
