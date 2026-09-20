import { isPersonalAuth, UserRole } from '@furniture-erp/shared';
import { Bell, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { useBusinessUnreadCount } from '@/features/notifications/use-business-notifications';
import { navItemForPath } from '@/routes/navigation';
import { ROUTES } from '@/routes/paths';

import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './UserMenu';

export interface HeaderProps {
  onOpenNavigation: () => void;
}

/** Names the current module and carries the account menu. */
export function Header({ onOpenNavigation }: HeaderProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { data: user } = useCurrentUser();
  const item = navItemForPath(pathname);
  const title = item ? t(item.labelKey) : t('app.name');
  const showBell = Boolean(user && !isPersonalAuth(user) && user.role !== UserRole.PLATFORM_ADMIN);
  const unread = useBusinessUnreadCount();

  return (
    <header className="sticky top-0 z-30 flex h-header shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenNavigation}
        aria-label={t('nav.openNav')}
        className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-input text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-ink">
        {title}
      </h1>

      {showBell ? (
        <NavLink
          to={ROUTES.notifications}
          aria-label={t('settings.hubNotifications')}
          className="relative shrink-0 rounded-full p-1.5 text-ink-muted hover:bg-surface-hover hover:text-ink"
        >
          <Bell className="size-5" aria-hidden="true" />
          {unread.badge ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-danger-600 px-1 text-[9px] font-semibold leading-4 text-white">
              {unread.badge}
            </span>
          ) : null}
        </NavLink>
      ) : null}

      <LanguageSwitcher />
      <UserMenu />
    </header>
  );
}
