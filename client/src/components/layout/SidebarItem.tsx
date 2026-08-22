import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/cn';

export interface SidebarItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Lets the mobile drawer close itself once the user has picked a destination. */
  onNavigate?: () => void;
  badge?: number;
  /** Exact path match. Use for nested siblings that share a prefix. */
  end?: boolean;
  /** Indent nested links under a platform group. */
  nested?: boolean;
}

export function SidebarItem({
  to,
  label,
  icon: Icon,
  onNavigate,
  badge,
  end = false,
  nested = false,
}: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-input px-3 py-2 text-sm font-medium transition-colors',
          nested && 'py-1.5 pl-10 text-[13px]',
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-ink-soft hover:bg-surface-hover hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn('size-4 shrink-0', isActive ? 'text-brand-600' : 'text-ink-subtle')}
            aria-hidden="true"
          />
          <span className="truncate">{label}</span>
          {badge && badge > 0 ? (
            <span className="ml-auto rounded-full bg-warning-50 px-1.5 py-0.5 text-[11px] font-semibold text-warning-700">
              {badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}
