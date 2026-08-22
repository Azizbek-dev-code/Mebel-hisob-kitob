import type { DashboardWorkforce } from '@furniture-erp/shared';
import { HardHat } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/routes/paths';
import { formatMoneyCompact, initialsOf } from '@/utils/format';
import { roleLabel } from '@/utils/roles';

export interface WorkforceSectionProps {
  workforce?: DashboardWorkforce;
  periodLabel: string;
  isLoading: boolean;
}

/**
 * Staff activity already present in the store: active accounts and sales by seller.
 * Full worker management is a later phase — this only surfaces what already exists.
 */
export function WorkforceSection({ workforce, periodLabel, isLoading }: WorkforceSectionProps) {
  const hasSellers = (workforce?.sellers.length ?? 0) > 0;

  return (
    <SectionCard
      title="Workforce"
      description={periodLabel}
      className="min-w-0"
      action={
        <Link
          to={ROUTES.workers}
          className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          Ishchilar
        </Link>
      }
    >
      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="rounded-input bg-surface-muted px-3 py-2.5">
              <p className="text-xs text-ink-muted">Active staff</p>
              <p className="mt-1 text-sm font-semibold text-ink">{workforce?.activeStaff ?? 0}</p>
            </div>
            {(workforce?.unassignedSalesCount ?? 0) > 0 ? (
              <div className="rounded-input bg-warning-50 px-3 py-2.5">
                <p className="text-xs text-warning-700">Unassigned sales</p>
                <p className="mt-1 text-sm font-semibold text-warning-700">
                  {workforce!.unassignedSalesCount}
                </p>
              </div>
            ) : null}
          </div>

          {!hasSellers ? (
            <EmptyState
              icon={HardHat}
              title="No seller activity yet"
              description="Sales credited to a staff member will rank here once the Sales module is in use."
              className="py-2"
            />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {workforce!.sellers.map((seller) => (
                <li key={seller.userId} className="flex items-center gap-3 py-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                    {initialsOf(seller.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{seller.fullName}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {roleLabel(seller.role)}
                      {' · '}
                      {seller.salesCount} sale{seller.salesCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <p className="tabular-money shrink-0 text-sm font-semibold text-ink">
                    {formatMoneyCompact(seller.revenue)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </SectionCard>
  );
}
