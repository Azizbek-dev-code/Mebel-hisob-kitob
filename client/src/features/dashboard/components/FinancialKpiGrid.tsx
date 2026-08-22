import type { MetricChange, Money } from '@furniture-erp/shared';
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  HandCoins,
  Minus,
  Package,
  Receipt,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { formatMoney, formatPercentDelta } from '@/utils/format';

import { KpiCard, type KpiTone } from './KpiCard';

export interface FinancialKpiGridProps {
  revenue?: Money;
  costOfGoodsSold?: Money;
  grossProfit?: Money;
  operatingExpenses?: Money;
  netProfit?: Money;
  cashCollected?: Money;
  remainingReceivables?: Money;
  expenseCount?: number;
  periodLabel: string;
  changes?: {
    revenue?: MetricChange;
    costOfGoodsSold?: MetricChange;
    grossProfit?: MetricChange;
    operatingExpenses?: MetricChange;
    netProfit?: MetricChange;
    cashCollected?: MetricChange;
  } | null;
  isLoading: boolean;
}

function ComparisonFootnote({ change }: { change?: MetricChange | null }): ReactNode {
  if (!change) return null;
  if (change.changePercent === null) {
    return <span>Taqqoslash mavjud emas</span>;
  }

  const positive = change.changePercent > 0;
  const negative = change.changePercent < 0;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;
  const tone = positive ? 'text-success-700' : negative ? 'text-danger-700' : 'text-ink-muted';

  return (
    <span className={`inline-flex items-center gap-0.5 ${tone}`}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>
        {formatPercentDelta(change.changePercent)}
        <span className="text-ink-muted"> oldingi davrga nisbatan</span>
      </span>
    </span>
  );
}

function moneyValue(amount: Money | undefined, isLoading: boolean): string {
  if (isLoading) return '—';
  return formatMoney(amount ?? 0);
}

function profitTone(amount: Money | undefined): KpiTone {
  if ((amount ?? 0) < 0) return 'danger';
  return 'success';
}

/**
 * Primary + secondary financial KPIs for the admin dashboard.
 * Values are display-only; totals come from the analytics API.
 */
export function FinancialKpiGrid({
  revenue,
  costOfGoodsSold,
  grossProfit,
  operatingExpenses,
  netProfit,
  cashCollected,
  remainingReceivables,
  expenseCount,
  periodLabel,
  changes,
  isLoading,
}: FinancialKpiGridProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          title="Sotuv"
          context={periodLabel}
          value={moneyValue(revenue, isLoading)}
          icon={ShoppingBag}
          tone="brand"
          isLoading={isLoading}
          isEmpty={!isLoading && (revenue ?? 0) === 0}
          footnote={<ComparisonFootnote change={changes?.revenue} />}
        />
        <KpiCard
          title="Tannarx"
          context={periodLabel}
          value={moneyValue(costOfGoodsSold, isLoading)}
          icon={Package}
          tone="info"
          isLoading={isLoading}
          isEmpty={!isLoading && (costOfGoodsSold ?? 0) === 0}
          footnote={<ComparisonFootnote change={changes?.costOfGoodsSold} />}
        />
        <KpiCard
          title="Yalpi foyda"
          context={periodLabel}
          value={moneyValue(grossProfit, isLoading)}
          icon={(grossProfit ?? 0) < 0 ? TrendingDown : TrendingUp}
          tone={profitTone(grossProfit)}
          isLoading={isLoading}
          isEmpty={!isLoading && (grossProfit ?? 0) === 0}
          footnote={
            <>
              {(grossProfit ?? 0) < 0 ? (
                <span className="block text-danger-700">Zararli yalpi foyda</span>
              ) : null}
              <ComparisonFootnote change={changes?.grossProfit} />
            </>
          }
        />
        <KpiCard
          title="Xarajatlar"
          context={periodLabel}
          value={moneyValue(operatingExpenses, isLoading)}
          icon={Receipt}
          tone="warning"
          isLoading={isLoading}
          isEmpty={!isLoading && (operatingExpenses ?? 0) === 0}
          footnote={<ComparisonFootnote change={changes?.operatingExpenses} />}
        />
        <KpiCard
          title="Sof foyda"
          context={periodLabel}
          value={moneyValue(netProfit, isLoading)}
          icon={(netProfit ?? 0) < 0 ? TrendingDown : HandCoins}
          tone={profitTone(netProfit)}
          isLoading={isLoading}
          isEmpty={!isLoading && (netProfit ?? 0) === 0}
          footnote={
            <>
              {(netProfit ?? 0) < 0 ? (
                <span className="block text-danger-700">Davr zarari</span>
              ) : null}
              <ComparisonFootnote change={changes?.netProfit} />
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="Tushgan pul"
          context={periodLabel}
          value={moneyValue(cashCollected, isLoading)}
          icon={Wallet}
          tone="success"
          isLoading={isLoading}
          isEmpty={!isLoading && (cashCollected ?? 0) === 0}
          footnote={<ComparisonFootnote change={changes?.cashCollected} />}
        />
        <KpiCard
          title="Davr qarzdorligi"
          context={periodLabel}
          value={moneyValue(remainingReceivables, isLoading)}
          icon={CircleDollarSign}
          tone={(remainingReceivables ?? 0) > 0 ? 'danger' : 'success'}
          isLoading={isLoading}
          isEmpty={!isLoading && (remainingReceivables ?? 0) === 0}
          footnote={
            <span title="Tanlangan davrda sotilgan mahsulotlardan qolgan qarzdorlik.">
              Sotuvlardan qolgan qarz
            </span>
          }
        />
        <KpiCard
          title="Xarajatlar soni"
          context={periodLabel}
          value={isLoading ? '—' : String(expenseCount ?? 0)}
          icon={Receipt}
          tone="brand"
          isLoading={isLoading}
          isEmpty={!isLoading && (expenseCount ?? 0) === 0}
          footnote={isLoading ? undefined : 'Tanlangan davrdagi xarajat yozuvlari'}
        />
      </div>
    </div>
  );
}
