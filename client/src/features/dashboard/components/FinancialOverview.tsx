import type { DashboardFinancials } from '@furniture-erp/shared';
import { Scale } from 'lucide-react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/utils/format';

export interface FinancialOverviewProps {
  financials?: DashboardFinancials;
  periodLabel: string;
  isLoading: boolean;
}

/**
 * The period's result, line by line.
 *
 * Every figure is a stored accounting total — this panel only lays them out.
 * Net result is net profit less business expenses, which the schema keeps
 * outside a sale's cost price on purpose.
 */
export function FinancialOverview({ financials, periodLabel, isLoading }: FinancialOverviewProps) {
  const isEmpty =
    !isLoading &&
    (financials?.revenue ?? 0) === 0 &&
    (financials?.expenses ?? 0) === 0;

  return (
    <SectionCard title="Profit & expenses" description={periodLabel} className="min-w-0">
      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={Scale}
          title="No financial activity yet"
          description="Revenue, cost of goods, profit and expenses will appear once sales and expenses are recorded."
          className="py-4"
        />
      ) : (
        <div className="space-y-4">
          <ComparisonBars financials={financials!} />
          <dl className="divide-y divide-line border-t border-line">
            <MoneyRow label="Revenue" value={financials!.revenue} />
            <MoneyRow label="Cost of goods" value={financials!.costOfGoods} muted />
            <MoneyRow label="Gross profit" value={financials!.grossProfit} emphasis />
            <MoneyRow label="Additional sale costs" value={financials!.additionalCosts} muted />
            <MoneyRow label="Net profit" value={financials!.netProfit} emphasis />
            <MoneyRow label="Expenses" value={financials!.expenses} muted />
            <MoneyRow label="Net result" value={financials!.netResult} emphasis highlight />
          </dl>
        </div>
      )}
    </SectionCard>
  );
}

function ComparisonBars({ financials }: { financials: DashboardFinancials }) {
  const max = Math.max(
    financials.revenue,
    financials.costOfGoods,
    Math.abs(financials.grossProfit),
    financials.expenses,
    Math.abs(financials.netResult),
    1,
  );

  return (
    <div className="space-y-2.5" aria-hidden="true">
      <Bar label="Revenue" value={financials.revenue} max={max} tone="brand" />
      <Bar label="Cost of goods" value={financials.costOfGoods} max={max} tone="neutral" />
      <Bar label="Gross profit" value={financials.grossProfit} max={max} tone="success" />
      <Bar label="Expenses" value={financials.expenses} max={max} tone="warning" />
      <Bar label="Net result" value={financials.netResult} max={max} tone="info" />
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: 'brand' | 'neutral' | 'success' | 'warning' | 'info';
}) {
  const width = `${Math.min(100, (Math.abs(value) / max) * 100)}%`;
  const toneClass =
    tone === 'brand'
      ? 'bg-brand-500'
      : tone === 'success'
        ? value < 0
          ? 'bg-danger-500'
          : 'bg-success-500'
        : tone === 'warning'
          ? 'bg-warning-500'
          : tone === 'info'
            ? value < 0
              ? 'bg-danger-500'
              : 'bg-info-500'
            : 'bg-ink-subtle';

  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
      <span className="truncate text-xs text-ink-muted">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
        <div className={cn('h-full rounded-full transition-all', toneClass)} style={{ width }} />
      </div>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  muted = false,
  emphasis = false,
  highlight = false,
}: {
  label: string;
  value: number;
  muted?: boolean;
  emphasis?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 py-2.5',
        highlight && 'bg-surface-muted px-2 -mx-2 rounded-input',
      )}
    >
      <dt className={cn('text-sm', muted ? 'text-ink-muted' : 'text-ink-soft')}>{label}</dt>
      <dd
        className={cn(
          'tabular-money text-sm',
          emphasis ? 'font-semibold' : 'font-medium',
          value < 0 ? 'text-danger-600' : 'text-ink',
        )}
      >
        {formatMoney(value)}
      </dd>
    </div>
  );
}
