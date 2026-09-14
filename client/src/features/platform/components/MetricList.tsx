import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function MetricList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-line">{children}</div>;
}

export function MetricRow({
  label,
  value,
  to,
  hint,
}: {
  label: string;
  value: string;
  to?: string;
  hint?: string;
}) {
  const body = (
    <div className="flex min-w-0 items-baseline justify-between gap-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        {hint ? <span className="block text-xs text-ink-muted">{hint}</span> : null}
      </span>
      <span className="tabular-money shrink-0 text-sm font-semibold text-ink">{value}</span>
    </div>
  );

  if (!to) return body;
  return (
    <Link to={to} className={cn('block rounded-input px-1 -mx-1 hover:bg-surface-hover')}>
      {body}
    </Link>
  );
}
