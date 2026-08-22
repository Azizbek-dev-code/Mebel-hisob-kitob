import type { DashboardSummary } from '@furniture-erp/shared';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { dashboardService } from '@/services/dashboard.service';

import type { DashboardPeriod } from '../period';
import { isPeriodRequestable } from '../period';

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  summary: (period: DashboardPeriod) =>
    ['dashboard', 'summary', period.preset, period.from ?? null, period.to ?? null] as const,
};

/**
 * The dashboard's only query.
 *
 * `keepPreviousData` keeps the last period on screen while the next one loads,
 * so changing the period redraws the figures rather than collapsing the whole
 * page back to skeletons.
 */
export function useDashboardSummary(
  period: DashboardPeriod,
): UseQueryResult<DashboardSummary, Error> {
  return useQuery({
    queryKey: dashboardQueryKeys.summary(period),
    queryFn: ({ signal }) =>
      dashboardService.summary({ preset: period.preset, from: period.from, to: period.to }, signal),
    // A half-finished custom range would only earn a validation error.
    enabled: isPeriodRequestable(period),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
