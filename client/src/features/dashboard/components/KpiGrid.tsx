import type { DashboardSummary } from '@furniture-erp/shared';
import {
  CalendarDays,
  CircleDollarSign,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { formatMoney, formatMoneyCompact } from '@/utils/format';

import { KpiCard } from './KpiCard';

export interface KpiGridProps {
  summary?: DashboardSummary;
  isLoading: boolean;
}

/** The six headline figures across the top of the dashboard. */
export function KpiGrid({ summary, isLoading }: KpiGridProps) {
  const { t } = useTranslation();
  const kpis = summary?.kpis;
  const financials = summary?.financials;
  const periodLabel = summary?.range.label ?? t('dashboard.selectedPeriod');

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        title={t('dashboard.todaySales')}
        context={t('dashboard.today')}
        value={moneyValue(kpis?.todayRevenue, isLoading)}
        icon={ShoppingBag}
        tone="brand"
        isLoading={isLoading}
        isEmpty={!isLoading && (kpis?.todayRevenue ?? 0) === 0}
        footnote={saleCountFootnote(kpis?.todaySalesCount, isLoading, t)}
      />

      <KpiCard
        title={t('dashboard.monthSales')}
        context={t('dashboard.thisMonth')}
        value={moneyValue(kpis?.monthRevenue, isLoading)}
        icon={CalendarDays}
        tone="info"
        isLoading={isLoading}
        isEmpty={!isLoading && (kpis?.monthRevenue ?? 0) === 0}
        footnote={saleCountFootnote(kpis?.monthSalesCount, isLoading, t)}
      />

      <KpiCard
        title={t('dashboard.grossProfit')}
        context={periodLabel}
        value={moneyValue(financials?.grossProfit, isLoading)}
        icon={TrendingUp}
        tone={(financials?.grossProfit ?? 0) < 0 ? 'danger' : 'success'}
        isLoading={isLoading}
        isEmpty={!isLoading && (financials?.grossProfit ?? 0) === 0}
        footnote={
          isLoading
            ? undefined
            : t('dashboard.grossProfitFootnote', {
                revenue: formatMoneyCompact(financials?.revenue ?? 0),
              })
        }
      />

      <KpiCard
        title={t('dashboard.expenses')}
        context={periodLabel}
        value={moneyValue(financials?.expenses, isLoading)}
        icon={Receipt}
        tone="warning"
        isLoading={isLoading}
        isEmpty={!isLoading && (financials?.expenses ?? 0) === 0}
        footnote={isLoading ? undefined : t('dashboard.expensesFootnote')}
      />

      <KpiCard
        title={t('dashboard.customerDebt')}
        context={t('dashboard.outstandingNow')}
        value={moneyValue(kpis?.outstandingDebt, isLoading)}
        icon={CircleDollarSign}
        tone={(kpis?.outstandingDebt ?? 0) > 0 ? 'danger' : 'success'}
        isLoading={isLoading}
        isEmpty={!isLoading && (kpis?.outstandingDebt ?? 0) === 0}
        footnote={
          isLoading
            ? undefined
            : t('dashboard.customersWithBalance', { count: kpis?.customersInDebt ?? 0 })
        }
      />

      <KpiCard
        title={t('dashboard.salesCount')}
        context={periodLabel}
        value={isLoading ? '—' : String(kpis?.periodSalesCount ?? 0)}
        icon={Users}
        tone="brand"
        isLoading={isLoading}
        isEmpty={!isLoading && (kpis?.periodSalesCount ?? 0) === 0}
        footnote={
          isLoading
            ? undefined
            : t('dashboard.periodRevenue', {
                revenue: formatMoneyCompact(kpis?.periodRevenue ?? 0),
              })
        }
      />
    </div>
  );
}

function moneyValue(amount: number | undefined, isLoading: boolean): string {
  if (isLoading) return '—';
  return formatMoney(amount ?? 0);
}

function saleCountFootnote(
  count: number | undefined,
  isLoading: boolean,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (isLoading) return undefined;
  return t('dashboard.saleCount', { count: count ?? 0 });
}
