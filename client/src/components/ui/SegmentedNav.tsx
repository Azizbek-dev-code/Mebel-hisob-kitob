import { NavLink, useLocation } from 'react-router-dom';

import { cn } from '@/lib/cn';

export interface SegmentedNavItem {
  to: string;
  label: string;
  /** Exact match so a parent path is not active on its child filters. */
  end?: boolean;
  /** Extra prefixes that should light this tab (aliases and nested records). */
  matchPrefix?: readonly string[];
}

/**
 * In-page filter tabs. Used instead of duplicating the same links in the sidebar.
 * Horizontal scroll on 390px rather than wrapping into overflow.
 */
export function SegmentedNav({
  items,
  ariaLabel,
}: {
  items: readonly SegmentedNavItem[];
  ariaLabel: string;
}) {
  const { pathname } = useLocation();

  return (
    <nav aria-label={ariaLabel} className="-mx-1 max-w-full overflow-x-auto overflow-y-hidden">
      <div className="flex w-max min-w-full gap-1 rounded-input border border-line bg-surface-muted p-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => {
              const current = item.matchPrefix?.length
                ? item.matchPrefix.some(
                    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
                  )
                : isActive;
              return cn(
                'inline-flex min-h-10 shrink-0 items-center rounded-[0.4rem] px-3 text-sm font-medium whitespace-nowrap transition-colors',
                current
                  ? 'bg-surface text-brand-700 shadow-card'
                  : 'text-ink-soft hover:bg-surface-hover hover:text-ink',
              );
            }}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
