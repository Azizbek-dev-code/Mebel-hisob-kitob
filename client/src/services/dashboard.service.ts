import type { DashboardSummary, DashboardSummaryResponse, DateRangePreset } from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export interface DashboardSummaryParams {
  preset: DateRangePreset;
  /** `YYYY-MM-DD`. Only read for a custom period. */
  from?: string;
  to?: string;
}

export const dashboardService = {
  /**
   * The whole screen in one request.
   *
   * The server owns every calculation, so what arrives here is already the
   * figure to display — the client never sums money of its own.
   */
  async summary(params: DashboardSummaryParams, signal?: AbortSignal): Promise<DashboardSummary> {
    const { summary } = await apiClient.get<DashboardSummaryResponse>('/dashboard/summary', {
      searchParams: { preset: params.preset, from: params.from, to: params.to },
      signal,
    });

    return summary;
  },
};
