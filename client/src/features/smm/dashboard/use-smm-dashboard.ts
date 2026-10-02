import type { SmmAgencyDashboard, SmmFinanceChartPreset } from '@furniture-erp/shared';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { smmService } from '@/services/smm.service';

import { smmKeys } from '../hooks/use-smm';
import { isSmmPeriodRequestable, type SmmDashPeriod } from './period';

/**
 * Agency dashboard from `GET /api/smm/dashboard`.
 *
 * `keepPreviousData` keeps the last period/chart visible while the next loads.
 */
export function useSmmAgencyDashboard(
  period: SmmDashPeriod,
  financePreset: SmmFinanceChartPreset,
): UseQueryResult<SmmAgencyDashboard, Error> {
  const query = {
    preset: period.preset,
    from: period.from,
    to: period.to,
    financePreset,
  };

  return useQuery({
    queryKey: smmKeys.dashboard(query),
    queryFn: ({ signal }) => smmService.getAgencyDashboard(query, signal),
    enabled: isSmmPeriodRequestable(period),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
