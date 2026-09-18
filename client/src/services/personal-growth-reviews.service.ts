import type {
  GrowthMonthlyReportDto,
  GrowthWeeklyReviewDto,
  UpsertGrowthMonthlyReportRequest,
  UpsertGrowthWeeklyReviewRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalGrowthReviewsService = {
  weekly(weekStart?: string, signal?: AbortSignal) {
    return apiClient.get<GrowthWeeklyReviewDto>('/personal/growth/reviews/weekly', {
      signal,
      searchParams: weekStart ? { weekStart } : undefined,
    });
  },
  saveWeekly(body: UpsertGrowthWeeklyReviewRequest) {
    return apiClient.put<GrowthWeeklyReviewDto>('/personal/growth/reviews/weekly', { body });
  },
  monthly(yearMonth?: string, signal?: AbortSignal) {
    return apiClient.get<GrowthMonthlyReportDto>('/personal/growth/reports/monthly', {
      signal,
      searchParams: yearMonth ? { yearMonth } : undefined,
    });
  },
  saveMonthly(body: UpsertGrowthMonthlyReportRequest) {
    return apiClient.put<GrowthMonthlyReportDto>('/personal/growth/reports/monthly', { body });
  },
};
