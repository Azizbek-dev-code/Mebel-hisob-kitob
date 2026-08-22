import { cn } from '@/lib/cn';

export interface SkeletonProps {
  className?: string;
}

/**
 * A placeholder block for content that is still loading.
 *
 * Hidden from assistive technology: a screen reader is told the region is busy
 * by the surrounding `aria-busy`, and would otherwise announce nothing at all.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded-input bg-surface-hover', className)} aria-hidden="true" />
  );
}
