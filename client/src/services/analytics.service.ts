import type {
  DateRangePreset,
  ExpenseAnalytics,
  ExpenseAnalyticsResponse,
  FinancialSummary,
  FinancialSummaryResponse,
  FinancialTrend,
  FinancialTrendResponse,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export interface AnalyticsPeriodParams {
  preset?: DateRangePreset;
  /** Inclusive calendar dates `YYYY-MM-DD`. */
  from?: string;
  to?: string;
}

export interface FinancialSummaryParams extends AnalyticsPeriodParams {
  comparison?: 'previous' | null;
}

export const analyticsService = {
  /**
   * Store-scoped financial KPIs for the dashboard.
   * All money totals are computed on the server — display-only on the client.
   */
  async getFinancialSummary(
    params: FinancialSummaryParams,
    signal?: AbortSignal,
  ): Promise<FinancialSummary> {
    const { summary } = await apiClient.get<FinancialSummaryResponse>(
      '/analytics/financial-summary',
      {
        searchParams: {
          preset: params.preset,
          from: params.from,
          to: params.to,
          comparison: params.comparison ?? undefined,
        },
        signal,
      },
    );

    return summary;
  },

  /** Time-series for the financial performance chart. */
  async getFinancialTrend(
    params: AnalyticsPeriodParams,
    signal?: AbortSignal,
  ): Promise<FinancialTrend> {
    const { trend } = await apiClient.get<FinancialTrendResponse>('/analytics/financial-trend', {
      searchParams: {
        preset: params.preset,
        from: params.from,
        to: params.to,
      },
      signal,
    });

    return trend;
  },

  /**
   * Expense analytics: daily trend + category breakdown.
   * Totals are server-aggregated — never summed from expense list rows in the UI.
   */
  async getExpenseAnalytics(
    params: AnalyticsPeriodParams,
    signal?: AbortSignal,
  ): Promise<ExpenseAnalytics> {
    const { analytics } = await apiClient.get<ExpenseAnalyticsResponse>('/analytics/expenses', {
      searchParams: {
        preset: params.preset,
        from: params.from,
        to: params.to,
      },
      signal,
    });

    return analytics;
  },
};
