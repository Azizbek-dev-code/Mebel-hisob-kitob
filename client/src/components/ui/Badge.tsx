import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-hover text-ink-soft',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
  info: 'bg-info-50 text-info-700',
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

/** The status pill used for payment states, deltas and counts. */
export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
