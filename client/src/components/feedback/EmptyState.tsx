import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** A link to the module that would create the missing data, where one exists. */
  action?: ReactNode;
  className?: string;
}

/**
 * What a section shows when the query succeeded and there is simply nothing yet.
 *
 * Distinct from an error on purpose: a store that has not recorded a sale today
 * is not a fault, and telling it something went wrong would be a lie.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-4 py-8 text-center', className)}>
      <div className="flex size-10 items-center justify-center rounded-card bg-surface-hover text-ink-subtle">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-medium text-ink">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-xs text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
