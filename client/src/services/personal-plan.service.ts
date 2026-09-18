import type {
  CreateGrowthCalendarEventRequest,
  GrowthCalendarEventListResponse,
  GrowthDayPlanResponse,
  GrowthUpcomingRemindersResponse,
  UpdateGrowthCalendarEventRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalPlanService = {
  events(from: string, to: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ from, to });
    return apiClient.get<GrowthCalendarEventListResponse>(
      `/personal/plan/events?${params.toString()}`,
      { signal },
    );
  },
  day(date: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ date });
    return apiClient.get<GrowthDayPlanResponse>(`/personal/plan/day?${params.toString()}`, {
      signal,
    });
  },
  reminders(withinMinutes?: number, signal?: AbortSignal) {
    const params = new URLSearchParams();
    if (withinMinutes != null) params.set('withinMinutes', String(withinMinutes));
    const q = params.toString();
    return apiClient.get<GrowthUpcomingRemindersResponse>(
      `/personal/plan/reminders${q ? `?${q}` : ''}`,
      { signal },
    );
  },
  createEvent(body: CreateGrowthCalendarEventRequest) {
    return apiClient.post<{ event: GrowthDayPlanResponse['items'][number] }>(
      '/personal/plan/events',
      { body },
    );
  },
  updateEvent(id: string, body: UpdateGrowthCalendarEventRequest) {
    return apiClient.patch<{ event: GrowthDayPlanResponse['items'][number] }>(
      `/personal/plan/events/${id}`,
      { body },
    );
  },
};
