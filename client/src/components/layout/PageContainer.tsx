import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * The content column every application page sits in.
 *
 * Page gutters and the maximum content width are decided here rather than in each
 * feature, so a screen added in a later phase lines up with the rest by default.
 */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8', className)}>
      {children}
    </div>
  );
}
