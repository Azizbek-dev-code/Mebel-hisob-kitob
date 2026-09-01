import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';

import { DailyExpenseTrendChart } from '../components/DailyExpenseTrendChart';
import { ExpenseCategoryChart } from '../components/ExpenseCategoryChart';
import { FinancialKpiGrid } from '../components/FinancialKpiGrid';
import { FinancialPerformanceChart } from '../components/FinancialPerformanceChart';
import { PeriodSelector } from '../components/PeriodSelector';
import { QuickActions } from '../components/QuickActions';
import { TrialBanner } from '@/features/subscription/TrialBanner';
import { useExpenseAnalytics } from '../hooks/use-expense-analytics';
import { useFinancialSummary } from '../hooks/use-financial-summary';
import { useFinancialTrend } from '../hooks/use-financial-trend';
import { DEFAULT_PERIOD, type DashboardPeriod } from '../period';

/**
 * Admin financial overview:
 * KPI cards (4A) + performance chart (4B-1) + expense charts (4B-2).
 */
export function DashboardPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const [period, setPeriod] = useState<DashboardPeriod>(DEFAULT_PERIOD);
  const {
    data: summary,
    isPending,
    isFetching,
    isError,
    refetch,
  } = useFinancialSummary(period, 'previous');
  const {
    data: trend,
    isPending: isTrendPending,
    isFetching: isTrendFetching,
    isError: isTrendError,
    refetch: refetchTrend,
  } = useFinancialTrend(period);
  const {
    data: expenseAnalytics,
    isPending: isExpensePending,
    isFetching: isExpenseFetching,
    isError: isExpenseError,
    refetch: refetchExpenses,
  } = useExpenseAnalytics(period);

  const isLoading = isPending && !summary;
  const isTrendLoading = isTrendPending && !trend;
  const isExpenseLoading = isExpensePending && !expenseAnalytics;
  const metrics = summary?.metrics;
  const periodLabel = summary?.period.label ?? t('dashboard.selectedPeriod');
  const isEmptyPeriod =
    !isLoading &&
    Boolean(metrics) &&
    (metrics?.salesCount ?? 0) === 0 &&
    (metrics?.expenseCount ?? 0) === 0;

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-ink">{t('dashboard.title')}</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {user
                ? `${user.storeName} · ${summary?.period.label ?? t('dashboard.periodLoading')}`
                : t('dashboard.title')}
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <PeriodSelector period={period} onChange={setPeriod} disabled={isPending && !summary} />
            {summary && isFetching ? (
              <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Ma&apos;lumotlar yangilanmoqda…
              </p>
            ) : null}
          </div>
        </div>

        {isError && !summary ? (
          <div className="rounded-panel border border-line bg-surface shadow-card">
            <ErrorState
              title="Moliyaviy ma'lumotlarni yuklab bo'lmadi."
              message="Qayta urinib ko'ring. Agar xato takrorlansa, administrator bilan bog'laning."
              retryLabel="Qayta urinish"
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          </div>
        ) : (
          <>
            <TrialBanner />
            {isError && summary ? (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-danger-100 bg-danger-50 px-3 py-2.5"
              >
                <p className="text-sm text-danger-700">
                  Yangilab bo&apos;lmadi. Oxirgi muvaffaqiyatli yuklama ko&apos;rsatilmoqda.
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="inline-flex items-center gap-1.5 rounded-input border border-danger-100 bg-surface px-2.5 py-1 text-xs font-medium text-danger-700 transition-colors hover:bg-danger-50"
                >
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                  Qayta urinish
                </button>
              </div>
            ) : null}

            {isEmptyPeriod ? (
              <div
                role="status"
                className="rounded-panel border border-dashed border-line bg-surface px-4 py-6 text-center shadow-card"
              >
                <p className="text-sm font-medium text-ink">
                  Bu davr uchun moliyaviy ma&apos;lumot topilmadi.
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Sotuv yoki xarajat yo&apos;q — ko&apos;rsatkichlar 0 so&apos;m.
                </p>
              </div>
            ) : null}

            <FinancialKpiGrid
              revenue={metrics?.revenue}
              costOfGoodsSold={metrics?.costOfGoodsSold}
              grossProfit={metrics?.grossProfit}
              operatingExpenses={metrics?.operatingExpenses}
              netProfit={metrics?.netProfit}
              cashCollected={metrics?.cashCollected}
              remainingReceivables={metrics?.remainingReceivables}
              expenseCount={metrics?.expenseCount}
              periodLabel={periodLabel}
              changes={summary?.previousPeriod?.changes ?? null}
              isLoading={isLoading}
            />

            <FinancialPerformanceChart
              trend={trend}
              isLoading={isTrendLoading}
              isError={isTrendError}
              onRetry={() => void refetchTrend()}
              isRetrying={isTrendFetching}
            />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DailyExpenseTrendChart
                analytics={expenseAnalytics}
                isLoading={isExpenseLoading}
                isError={isExpenseError}
                onRetry={() => void refetchExpenses()}
                isRetrying={isExpenseFetching}
              />
              <ExpenseCategoryChart
                analytics={expenseAnalytics}
                isLoading={isExpenseLoading}
                isError={isExpenseError}
                onRetry={() => void refetchExpenses()}
                isRetrying={isExpenseFetching}
              />
            </div>

            <QuickActions />
          </>
        )}
      </div>
    </PageContainer>
  );
}
