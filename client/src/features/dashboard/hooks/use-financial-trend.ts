import type { FinancialTrend } from '@furniture-erp/shared';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { analyticsService } from '@/services/analytics.service';

import type { DashboardPeriod } from '../period';
import { isPeriodRequestable } from '../period';

export const financialTrendQueryKeys = {
  all: ['analytics', 'financial-trend'] as const,
  trend: (period: DashboardPeriod) =>
    [
      'analytics',
      'financial-trend',
      period.preset,
      period.from ?? null,
      period.to ?? null,
    ] as const,
};

/**
 * Financial performance chart series from `/api/analytics/financial-trend`.
 */
export function useFinancialTrend(
  period: DashboardPeriod,
): UseQueryResult<FinancialTrend, Error> {
  return useQuery({
    queryKey: financialTrendQueryKeys.trend(period),
    queryFn: ({ signal }) =>
      analyticsService.getFinancialTrend(
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
