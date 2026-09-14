import { BudgetWarningLevel } from '@furniture-erp/shared';

export function ProgressBar({
  percent,
  over,
  warningLevel,
}: {
  percent: number;
  over?: boolean;
  warningLevel?: BudgetWarningLevel;
}) {
  const width = Math.min(Math.max(percent, 0), 100);
  const level = warningLevel ?? (over ? BudgetWarningLevel.OVER : BudgetWarningLevel.NONE);
  const barClass =
    level === BudgetWarningLevel.OVER || level === BudgetWarningLevel.LIMIT
      ? 'h-full bg-danger-600'
      : level === BudgetWarningLevel.NEAR
        ? 'h-full bg-warning-500'
        : 'h-full bg-brand-500';

  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
      <div className={barClass} style={{ width: `${width}%` }} />
    </div>
  );
}
