import type {
  UpsertGrowthMonthlyReportRequest,
  UpsertGrowthWeeklyReviewRequest,
} from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalGrowthReviewsService } from '@/services/personal-growth-reviews.service';

export const personalGrowthReviewsKeys = {
  all: ['personal', 'growth', 'reviews'] as const,
  weekly: (weekStart?: string) =>
    [...personalGrowthReviewsKeys.all, 'weekly', weekStart ?? 'current'] as const,
  monthly: (yearMonth?: string) =>
    [...personalGrowthReviewsKeys.all, 'monthly', yearMonth ?? 'current'] as const,
};

export function useGrowthWeeklyReview(weekStart?: string) {
  return useQuery({
    queryKey: personalGrowthReviewsKeys.weekly(weekStart),
    queryFn: ({ signal }) => personalGrowthReviewsService.weekly(weekStart, signal),
  });
}

export function useSaveGrowthWeeklyReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertGrowthWeeklyReviewRequest) =>
      personalGrowthReviewsService.saveWeekly(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: personalGrowthReviewsKeys.all });
    },
  });
}

export function useGrowthMonthlyReport(yearMonth?: string) {
  return useQuery({
    queryKey: personalGrowthReviewsKeys.monthly(yearMonth),
    queryFn: ({ signal }) => personalGrowthReviewsService.monthly(yearMonth, signal),
  });
}

export function useSaveGrowthMonthlyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertGrowthMonthlyReportRequest) =>
      personalGrowthReviewsService.saveMonthly(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: personalGrowthReviewsKeys.all });
    },
  });
}
