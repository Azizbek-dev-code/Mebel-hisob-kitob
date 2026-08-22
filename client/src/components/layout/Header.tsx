import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { navItemForPath } from '@/routes/navigation';

import { UserMenu } from './UserMenu';

export interface HeaderProps {
  onOpenNavigation: () => void;
}

/** Names the current module and carries the account menu. */
export function Header({ onOpenNavigation }: HeaderProps) {
  const { pathname } = useLocation();
  const title = navItemForPath(pathname)?.label ?? 'Furniture ERP';

  return (
    <header className="sticky top-0 z-30 flex h-header shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenNavigation}
        aria-label="Open navigation"
        className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-input text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-ink">
        {title}
      </h1>

      <UserMenu />
    </header>
  );
}
