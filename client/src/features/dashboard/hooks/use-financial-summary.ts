import type { FinancialSummary } from '@furniture-erp/shared';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { analyticsService } from '@/services/analytics.service';

import type { DashboardPeriod } from '../period';
import { isPeriodRequestable } from '../period';

export const financialSummaryQueryKeys = {
  all: ['analytics', 'financial-summary'] as const,
  summary: (period: DashboardPeriod, comparison: 'previous' | null) =>
    [
      'analytics',
      'financial-summary',
      period.preset,
      period.from ?? null,
      period.to ?? null,
      comparison,
    ] as const,
};

/**
 * Financial dashboard summary from `/api/analytics/financial-summary`.
 *
 * `keepPreviousData` keeps the last period visible while the next loads.
 */
export function useFinancialSummary(
  period: DashboardPeriod,
  comparison: 'previous' | null = 'previous',
): UseQueryResult<FinancialSummary, Error> {
  return useQuery({
    queryKey: financialSummaryQueryKeys.summary(period, comparison),
    queryFn: ({ signal }) =>
      analyticsService.getFinancialSummary(
        {
          preset: period.preset,
          from: period.from,
          to: period.to,
          comparison,
        },
        signal,
      ),
    enabled: isPeriodRequestable(period),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
