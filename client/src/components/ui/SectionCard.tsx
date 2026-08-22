import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface SectionCardProps {
  title: string;
  description?: string;
  /** Rendered opposite the title: a filter, a link, a total. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Turn off when the body owns its own padding, such as a full-bleed table. */
  padded?: boolean;
}

/**
 * The panel every dashboard section sits in.
 *
 * The surface, hairline and shadow are decided once here rather than repeated
 * per section, so the sections line up with each other and with the login and
 * placeholder screens built in the earlier phases.
 */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  padded = true,
}: SectionCardProps) {
  return (
    <section className={cn('rounded-panel border border-line bg-surface shadow-card', className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-ink-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>

      <div className={cn(padded && 'p-4 sm:p-5')}>{children}</div>
    </section>
  );
}
