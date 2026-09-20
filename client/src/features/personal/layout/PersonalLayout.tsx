import { isPersonalAuth } from '@furniture-erp/shared';
import { Bell } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AccountSwitcher } from '@/features/accounts/components/AccountSwitcher';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { useNoIndex } from '@/features/marketing/hooks/use-page-seo';
import { PersonalBillingGate } from '@/features/personal/billing/components/PersonalBillingGate';
import { PersonalTrialBanner } from '@/features/personal/billing/components/PersonalTrialBanner';
import { PersonalFeedbackPrompts } from '@/features/personal/settings/components/PersonalFeedbackPrompts';
import { cn } from '@/lib/cn';
import { PERSONAL_NAV_ITEMS, type NavItem } from '@/routes/navigation';
import { ROUTES } from '@/routes/paths';

import { PersonalBackBar } from './PersonalBackBar';
import { AddMoneyFab } from './AddMoneyFab';
import { useUnreadNotificationCount } from './use-unread-notifications';
import { PresenceTracker } from '@/features/presence/PresenceTracker';

function pathMatches(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function itemIsActive(pathname: string, item: NavItem): boolean {
  if (pathMatches(pathname, item.to)) return true;
  return Boolean(item.matchingPaths?.some((path) => pathMatches(pathname, path)));
}

function UnreadBadge({ value }: { value: string }) {
  if (!value) return null;
  return (
    <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-danger-600 px-1 text-[9px] font-semibold leading-4 text-white">
      {value}
    </span>
  );
}

export function PersonalLayout() {
  useNoIndex();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { data: user } = useCurrentUser();
  const unread = useUnreadNotificationCount();
  const title =
    user && isPersonalAuth(user) ? t('personal.appTitle') : (user?.storeName ?? t('app.name'));

  return (
    <div className="pf-shell min-h-dvh overflow-x-hidden bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-surface md:flex">
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
          <p className="min-w-0 truncate text-sm font-semibold tracking-tight text-ink">{title}</p>
          <NavLink
            to={ROUTES.personalNotifications}
            className="relative shrink-0 rounded-full p-1.5 text-ink-muted hover:bg-surface-hover hover:text-ink"
            aria-label={t('personal.notifications')}
          >
            <Bell className="size-4" aria-hidden="true" />
            <UnreadBadge value={unread.badge} />
          </NavLink>
        </div>
        <nav aria-label={t('nav.modules')} className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-0.5">
            {PERSONAL_NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <PrimaryLink
                  item={item}
                  active={itemIsActive(pathname, item)}
                  badge={item.key === 'personal-profile' ? unread.badge : ''}
                />
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-line p-3">
          <AccountSwitcher variant="sidebar" includeSessionActions />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface px-4 md:hidden">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{title}</p>
        <NavLink
          to={ROUTES.personalNotifications}
          className="relative shrink-0 rounded-full p-1.5 text-ink-muted"
          aria-label={t('personal.notifications')}
        >
          <Bell className="size-5" aria-hidden="true" />
          <UnreadBadge value={unread.badge} />
        </NavLink>
        <AccountSwitcher variant="avatar" includeSessionActions />
      </header>

      <div className="md:pl-56">
        <main className="mx-auto w-full max-w-3xl px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-5 md:px-6 md:pb-8 md:pt-6">
          <div className="space-y-5">
            <PersonalBackBar />
            <PersonalTrialBanner />
            <Outlet />
          </div>
        </main>
      </div>

      <nav
        aria-label={t('nav.modules')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {PERSONAL_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = itemIsActive(pathname, item);
            const badge = item.key === 'personal-profile' ? unread.badge : '';
            return (
              <li key={item.key} className="min-w-0">
                <NavLink
                  to={item.to}
                  className={cn(
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] leading-tight sm:text-[11px]',
                    active ? 'text-brand-700' : 'text-ink-muted',
                  )}
                >
                  <span className="relative">
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    <UnreadBadge value={badge} />
                  </span>
                  <span className="w-full truncate text-center">{t(item.labelKey)}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      <AddMoneyFab />
      <PersonalBillingGate />
      <PersonalFeedbackPrompts />
      <PresenceTracker />
    </div>
  );
}

function PrimaryLink({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge?: string;
}) {
  const { t } = useTranslation();
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={cn(
        'flex items-center gap-2.5 rounded-input px-3 py-2 text-sm',
        active ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink-muted hover:bg-surface-hover hover:text-ink',
      )}
    >
      <span className="relative">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <UnreadBadge value={badge ?? ''} />
      </span>
      <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
    </NavLink>
  );
}
