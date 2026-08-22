import type { ExpenseAnalytics } from '@furniture-erp/shared';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { analyticsService } from '@/services/analytics.service';

import type { DashboardPeriod } from '../period';
import { isPeriodRequestable } from '../period';

export const expenseAnalyticsQueryKeys = {
  all: ['analytics', 'expenses'] as const,
  analytics: (period: DashboardPeriod) =>
    [
      'analytics',
      'expenses',
      period.preset,
      period.from ?? null,
      period.to ?? null,
    ] as const,
};

/**
 * Expense daily trend + category breakdown from `/api/analytics/expenses`.
 */
export function useExpenseAnalytics(
  period: DashboardPeriod,
): UseQueryResult<ExpenseAnalytics, Error> {
  return useQuery({
    queryKey: expenseAnalyticsQueryKeys.analytics(period),
    queryFn: ({ signal }) =>
      analyticsService.getExpenseAnalytics(
        {
          preset: period.preset,
          from: period.from,
          to: period.to,
        },
        signal,
      ),
    enabled: isPeriodRequestable(period),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
