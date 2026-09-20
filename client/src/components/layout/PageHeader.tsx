import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/cn';

export function PageHeader({
  title,
  backTo,
  backLabel,
  className,
}: {
  title: string;
  backTo?: string;
  backLabel?: string;
  className?: string;
}) {
  if (backTo) {
    return (
      <div className={cn('flex min-w-0 items-center gap-1', className)}>
        <Link
          to={backTo}
          aria-label={backLabel ? `Orqaga: ${backLabel}` : title}
          className="inline-flex min-w-0 items-center gap-1 rounded-input py-1 pr-2 text-sm font-semibold text-ink hover:bg-surface-hover"
        >
          <ChevronLeft className="size-5 shrink-0" aria-hidden="true" />
          <span className="truncate">{backLabel ?? title}</span>
        </Link>
      </div>
    );
  }

  return (
    <h1 className={cn('text-lg font-semibold tracking-tight text-ink', className)}>{title}</h1>
  );
}
