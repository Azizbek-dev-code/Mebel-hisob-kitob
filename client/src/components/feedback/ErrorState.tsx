import { AlertCircle, RefreshCw } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  /** Defaults to "Try again". */
  retryLabel?: string;
  isRetrying?: boolean;
  className?: string;
}

/**
 * A failed request, with the way out.
 *
 * A dashboard that goes blank when the API blinks is worse than useless, so
 * every section that can fail says what failed and offers to try again.
 */
export function ErrorState({
  title = 'Could not load this section',
  message,
  onRetry,
  retryLabel = 'Try again',
  isRetrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center px-4 py-8 text-center', className)}>
      <div className="flex size-10 items-center justify-center rounded-card bg-danger-50 text-danger-500">
        <AlertCircle className="size-5" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-ink-muted">{message}</p>

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-4 inline-flex items-center gap-2 rounded-input border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={cn('size-4', isRetrying && 'animate-spin')} aria-hidden="true" />
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
