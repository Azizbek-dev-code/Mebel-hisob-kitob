import type { DashboardDebt } from '@furniture-erp/shared';
import { CircleDollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/routes/paths';
import { formatMoney } from '@/utils/format';

export interface DebtSectionProps {
  debt?: DashboardDebt;
  isLoading: boolean;
}

/**
 * Outstanding customer debt as of now — a balance, not a period figure.
 */
export function DebtSection({ debt, isLoading }: DebtSectionProps) {
  const isEmpty = !isLoading && (debt?.customersInDebt ?? 0) === 0;

  return (
    <SectionCard
      title="Customer debt"
      description="Outstanding balances right now"
      className="min-w-0"
      action={
        <Link
          to={ROUTES.debts}
          className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          Qarzlar
        </Link>
      }
    >
      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={CircleDollarSign}
          title="No outstanding debt"
          description="Customers with unpaid balances will appear here once sales start recording deposits and installments."
          className="py-4"
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Total outstanding"
              value={formatMoney(debt!.totalOutstanding)}
              tone="danger"
            />
            <Stat
              label="Customers in debt"
              value={String(debt!.customersInDebt)}
              tone="neutral"
            />
            <Stat
              label="Overdue installments"
              value={String(debt!.overdueInstallmentCount)}
              tone="warning"
            />
            <Stat
              label="Overdue amount"
              value={formatMoney(debt!.overdueAmount)}
              tone="warning"
            />
          </div>

          {debt!.topDebtors.length > 0 ? (
            <ul className="divide-y divide-line border-t border-line">
              {debt!.topDebtors.map((debtor) => (
                <li
                  key={debtor.customerId}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{debtor.customerName}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {debtor.phone}
                      {' · '}
                      {debtor.saleCount} sale{debtor.saleCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <p className="tabular-money shrink-0 text-sm font-semibold text-danger-600">
                    {formatMoney(debtor.outstanding)}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'danger' | 'warning' | 'neutral';
}) {
  const valueClass =
    tone === 'danger'
      ? 'text-danger-600'
      : tone === 'warning'
        ? 'text-warning-700'
        : 'text-ink';

  return (
    <div className="rounded-input bg-surface-muted px-3 py-2.5">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`tabular-money mt-1 text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
