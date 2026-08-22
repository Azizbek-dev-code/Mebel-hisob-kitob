import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { DateRangePreset } from '@furniture-erp/shared';

import { isPeriodRequestable, type DashboardPeriod } from '@/features/dashboard/period';
import { reportsService } from '@/services/reports.service';

export const reportsKeys = {
  all: ['reports'] as const,
  bundle: (period: DashboardPeriod, limit: number) =>
    [...reportsKeys.all, 'bundle', period, limit] as const,
};

export function useReportsBundle(period: DashboardPeriod, limit = 10, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.bundle(period, limit),
    queryFn: ({ signal }) =>
      reportsService.getBundle(
        {
          preset: period.preset as DateRangePreset,
          from: period.from,
          to: period.to,
          limit,
        },
        signal,
      ),
    enabled: enabled && isPeriodRequestable(period),
    placeholderData: keepPreviousData,
  });
}
