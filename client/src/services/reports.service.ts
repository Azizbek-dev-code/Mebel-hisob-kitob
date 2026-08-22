import type {
  ReportsBundle,
  ReportsBundleResponse,
  DateRangePreset,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export interface ReportsPeriodParams {
  preset?: DateRangePreset;
  from?: string;
  to?: string;
  limit?: number;
}

/**
 * Financial reports API — read-only aggregates.
 * storeId is never sent; session supplies it.
 */
export const reportsService = {
  async getBundle(params: ReportsPeriodParams = {}, signal?: AbortSignal): Promise<ReportsBundle> {
    const { reports } = await apiClient.get<ReportsBundleResponse>('/reports/bundle', {
      searchParams: {
        preset: params.preset,
        from: params.from,
        to: params.to,
        limit: params.limit,
      },
      signal,
    });
    return reports;
  },
};
