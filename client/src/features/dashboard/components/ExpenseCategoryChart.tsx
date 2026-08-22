import type { ExpenseAnalytics, ExpenseCategoryBreakdownItem } from '@furniture-erp/shared';
import { PieChart } from 'lucide-react';
import { useMemo } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatMoney } from '@/utils/format';

export interface ExpenseCategoryChartProps {
  analytics?: ExpenseAnalytics;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

const BAR_COLORS = ['#6366f1', '#2e90fa', '#12b76a', '#f79009', '#f04438', '#7a5af8', '#15b79e'];

/**
 * Horizontal bar breakdown of operating expenses by category.
 * Amounts and percentages come from the server analytics response.
 */
export function ExpenseCategoryChart({
  analytics,
  isLoading,
  isError = false,
  onRetry,
  isRetrying = false,
}: ExpenseCategoryChartProps) {
  const categories = useMemo(() => analytics?.byCategory ?? [], [analytics?.byCategory]);
  const hasCategories = categories.some((row) => row.amount > 0);
  const maxAmount = useMemo(
    () => Math.max(...categories.map((row) => row.amount), 0),
    [categories],
  );

  return (
    <SectionCard
      title="Xarajatlar kategoriyalar bo'yicha"
      description="Tanlangan davrdagi kategoriya ulushi"
      padded={false}
      className="min-w-0"
    >
      {isLoading ? (
        <div
          className="space-y-3 p-4 sm:p-5"
          aria-busy="true"
          data-testid="expense-category-chart-loading"
        >
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-5/6" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      ) : isError && !analytics ? (
        <ErrorState
          title="Xarajatlar ma'lumotlarini yuklab bo'lmadi."
          message="Qayta urinib ko'ring."
          retryLabel="Qayta urinish"
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      ) : !hasCategories ? (
        <EmptyState
          icon={PieChart}
          title="Xarajatlar kategoriyasi mavjud emas."
          description="Tanlangan davrda kategoriya bo'yicha xarajat yo'q."
        />
      ) : (
        <div className="space-y-4 p-3 sm:p-5" data-testid="expense-category-chart">
          <p className="tabular-money text-lg font-semibold text-ink">
            {formatMoney(analytics?.total ?? 0)}
          </p>

          <ul className="space-y-3" aria-label="Kategoriya bo'yicha xarajatlar">
            {categories.map((row, index) => (
              <CategoryBar
                key={row.categoryId}
                row={row}
                maxAmount={maxAmount}
                color={BAR_COLORS[index % BAR_COLORS.length]!}
              />
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

function CategoryBar({
  row,
  maxAmount,
  color,
}: {
  row: ExpenseCategoryBreakdownItem;
  maxAmount: number;
  color: string;
}) {
  const widthPercent = maxAmount === 0 ? 0 : Math.round((row.amount * 1000) / maxAmount) / 10;
  const shareLabel = row.percentage === null ? '—' : `${row.percentage}%`;

  return (
    <li className="min-w-0" data-category-id={row.categoryId}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium text-ink" title={row.categoryName}>
          {row.categoryName}
        </p>
        <p className="shrink-0 text-xs text-ink-muted">
          <span className="tabular-money font-medium text-ink">{formatMoney(row.amount)}</span>
          <span className="mx-1 text-ink-subtle">·</span>
          <span>{shareLabel}</span>
        </p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${widthPercent}%`, backgroundColor: color }}
          role="presentation"
          data-bar-amount={row.amount}
        />
      </div>
    </li>
  );
}
