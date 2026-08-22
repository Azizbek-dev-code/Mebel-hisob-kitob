import type { DashboardSummary } from '@furniture-erp/shared';
import {
  CalendarDays,
  CircleDollarSign,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react';

import { formatMoney, formatMoneyCompact } from '@/utils/format';

import { KpiCard } from './KpiCard';

export interface KpiGridProps {
  summary?: DashboardSummary;
  isLoading: boolean;
}

/** The six headline figures across the top of the dashboard. */
export function KpiGrid({ summary, isLoading }: KpiGridProps) {
  const kpis = summary?.kpis;
  const financials = summary?.financials;
  const periodLabel = summary?.range.label ?? 'Selected period';

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        title="Today's sales"
        context="Today"
        value={moneyValue(kpis?.todayRevenue, isLoading)}
        icon={ShoppingBag}
        tone="brand"
        isLoading={isLoading}
        isEmpty={!isLoading && (kpis?.todayRevenue ?? 0) === 0}
        footnote={saleCountFootnote(kpis?.todaySalesCount, isLoading)}
      />

      <KpiCard
        title="Monthly sales"
        context="This month"
        value={moneyValue(kpis?.monthRevenue, isLoading)}
        icon={CalendarDays}
        tone="info"
        isLoading={isLoading}
        isEmpty={!isLoading && (kpis?.monthRevenue ?? 0) === 0}
        footnote={saleCountFootnote(kpis?.monthSalesCount, isLoading)}
      />

      <KpiCard
        title="Gross profit"
        context={periodLabel}
        value={moneyValue(financials?.grossProfit, isLoading)}
        icon={TrendingUp}
        tone={(financials?.grossProfit ?? 0) < 0 ? 'danger' : 'success'}
        isLoading={isLoading}
        isEmpty={!isLoading && (financials?.grossProfit ?? 0) === 0}
        footnote={
          isLoading
            ? undefined
            : `Revenue ${formatMoneyCompact(financials?.revenue ?? 0)} − cost of goods`
        }
      />

      <KpiCard
        title="Expenses"
        context={periodLabel}
        value={moneyValue(financials?.expenses, isLoading)}
        icon={Receipt}
        tone="warning"
        isLoading={isLoading}
        isEmpty={!isLoading && (financials?.expenses ?? 0) === 0}
        footnote={isLoading ? undefined : 'Business running costs in this period'}
      />

      <KpiCard
        title="Customer debt"
        context="Outstanding now"
        value={moneyValue(kpis?.outstandingDebt, isLoading)}
        icon={CircleDollarSign}
        tone={(kpis?.outstandingDebt ?? 0) > 0 ? 'danger' : 'success'}
        isLoading={isLoading}
        isEmpty={!isLoading && (kpis?.outstandingDebt ?? 0) === 0}
        footnote={
          isLoading
            ? undefined
            : `${kpis?.customersInDebt ?? 0} customer${(kpis?.customersInDebt ?? 0) === 1 ? '' : 's'} with a balance`
        }
      />

      <KpiCard
        title="Number of sales"
        context={periodLabel}
        value={isLoading ? '—' : String(kpis?.periodSalesCount ?? 0)}
        icon={Users}
        tone="brand"
        isLoading={isLoading}
        isEmpty={!isLoading && (kpis?.periodSalesCount ?? 0) === 0}
        footnote={
          isLoading
            ? undefined
            : `Period revenue ${formatMoneyCompact(kpis?.periodRevenue ?? 0)}`
        }
      />
    </div>
  );
}

function moneyValue(amount: number | undefined, isLoading: boolean): string {
  if (isLoading) return '—';
  return formatMoney(amount ?? 0);
}

function saleCountFootnote(count: number | undefined, isLoading: boolean) {
  if (isLoading) return undefined;
  const sales = count ?? 0;
  return `${sales} sale${sales === 1 ? '' : 's'}`;
}
