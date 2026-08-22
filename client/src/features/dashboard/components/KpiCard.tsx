import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

export type KpiTone = 'brand' | 'success' | 'warning' | 'danger' | 'info';

const ICON_CLASSES: Record<KpiTone, string> = {
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-500',
  info: 'bg-info-50 text-info-600',
};

export interface KpiCardProps {
  title: string;
  /** The period or scope the figure covers, so no card is ambiguous. */
  context: string;
  value: string;
  icon: LucideIcon;
  tone?: KpiTone;
  /** A count, a comparison, or a note on why the figure is what it is. */
  footnote?: ReactNode;
  isLoading?: boolean;
  /** Renders a muted value: the metric is real but the store has none of it yet. */
  isEmpty?: boolean;
}

export function KpiCard({
  title,
  context,
  value,
  icon: Icon,
  tone = 'brand',
  footnote,
  isLoading = false,
  isEmpty = false,
}: KpiCardProps) {
  return (
    <article
      aria-busy={isLoading}
      className="rounded-card border border-line bg-surface p-4 shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-ink-soft">{title}</h3>
          <p className="mt-0.5 truncate text-xs text-ink-subtle">{context}</p>
        </div>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-input',
            ICON_CLASSES[tone],
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>

      {isLoading ? (
        <Skeleton className="mt-3 h-7 w-32" />
      ) : (
        <p
          className={cn(
            'tabular-money mt-3 truncate text-xl font-semibold tracking-tight sm:text-2xl',
            isEmpty ? 'text-ink-subtle' : 'text-ink',
          )}
          title={value}
        >
          {value}
        </p>
      )}

      {isLoading ? (
        <Skeleton className="mt-2 h-3.5 w-24" />
      ) : footnote ? (
        <div className="mt-1.5 text-xs text-ink-muted">{footnote}</div>
      ) : null}
    </article>
  );
}
