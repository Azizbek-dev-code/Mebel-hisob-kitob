import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { usePendingStoreRequestCount } from '@/features/store-creation/hooks/use-store-creation';
import { usePlatformSubscriptionRequests } from '@/features/platform/hooks/use-platform-billing';
import { cn } from '@/lib/cn';
import {
  type NavItem,
  NAV_ITEMS,
  canReviewStoreCreationRequests,
  navItemsForUser,
} from '@/routes/navigation';
import { SubscriptionRequestStatus } from '@furniture-erp/shared';

import { SidebarItem } from './SidebarItem';
import { SignOutButton } from './SignOutButton';

export interface SidebarProps {
  /** Called after a navigation item is chosen; the drawer uses it to close. */
  onNavigate?: () => void;
  /** When provided, the panel shows a close control — the drawer needs one, the fixed rail does not. */
  onRequestClose?: () => void;
}

function pathIsActive(pathname: string, to: string, end: boolean): boolean {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

function groupIsActive(pathname: string, item: NavItem): boolean {
  if (pathIsActive(pathname, item.to, false)) return true;
  if (item.matchingPaths?.some((path) => pathIsActive(pathname, path, false))) return true;
  return Boolean(item.children?.some((child) => pathIsActive(pathname, child.to, true)));
}

/** The module list. Rendered once as the fixed desktop rail and once inside the mobile drawer. */
export function Sidebar({ onNavigate, onRequestClose }: SidebarProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { data: user, isPending } = useCurrentUser();
  // While auth is loading, show the owner rail (settings = Profil) so worker
  // `/profile` and owner `/settings` never appear together under the same label.
  const items = user
    ? navItemsForUser(user)
    : isPending
      ? NAV_ITEMS.filter(
          (item) =>
            item.key !== 'my-sales' &&
            item.key !== 'my-reports' &&
            item.key !== 'profile' &&
            item.key !== 'purchases' &&
            item.key !== 'suppliers' &&
            item.key !== 'debts' &&
            item.key !== 'expenses' &&
            item.key !== 'my-finances',
        )
      : [];
  const pending = usePendingStoreRequestCount(canReviewStoreCreationRequests(user));
  const pendingCount = pending.data?.pendingCount ?? 0;
  const tariffRequests = usePlatformSubscriptionRequests(
    SubscriptionRequestStatus.PENDING,
    canReviewStoreCreationRequests(user),
  );
  const tariffPending = tariffRequests.data?.items.length ?? 0;

  return (
    <div className="flex h-full w-full flex-col bg-surface">
      <div className="flex h-header shrink-0 items-center gap-2.5 border-b border-line px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-input bg-brand-500 text-white">
          <svg viewBox="0 0 32 32" className="size-5" aria-hidden="true">
            <path
              d="M8 13.5a2.5 2.5 0 0 1 5 0V17h6v-3.5a2.5 2.5 0 0 1 5 0V22h-2.5v-2.5h-11V22H8z"
              fill="currentColor"
            />
          </svg>
        </div>
        <span className="truncate text-sm font-semibold tracking-tight text-ink">
          {canReviewStoreCreationRequests(user) ? 'Platform Admin' : t('app.name')}
        </span>

        {onRequestClose ? (
          <button
            type="button"
            onClick={onRequestClose}
            aria-label={t('common.close')}
            className="ml-auto -mr-1 flex size-8 shrink-0 items-center justify-center rounded-input text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav aria-label={t('nav.modules')} className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.key}>
              {item.children?.length ? (
                <div
                  className={cn(
                    'rounded-input',
                    groupIsActive(pathname, item) && 'bg-surface-hover/80',
                  )}
                >
                  <SidebarItem
                    to={item.to}
                    label={t(item.labelKey)}
                    icon={item.icon}
                    onNavigate={onNavigate}
                    end
                    isCurrent={groupIsActive(pathname, item)}
                    badge={
                      item.key === 'platform-accounts'
                        ? pendingCount
                        : item.key === 'platform-subscriptions'
                          ? tariffPending
                          : undefined
                    }
                  />
                  <ul className="mb-1 space-y-0.5">
                    {item.children.map((child) => (
                      <li key={child.key}>
                        <SidebarItem
                          to={child.to}
                          label={t(child.labelKey)}
                          icon={child.icon}
                          onNavigate={onNavigate}
                          nested
                          end
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <SidebarItem
                  to={item.to}
                  label={t(item.labelKey)}
                  icon={item.icon}
                  onNavigate={onNavigate}
                  end={item.to === '/dashboard'}
                  isCurrent={groupIsActive(pathname, item)}
                  badge={
                    item.key === 'platform-accounts'
                      ? pendingCount
                      : item.key === 'platform-subscriptions'
                        ? tariffPending
                        : undefined
                  }
                />
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <SignOutButton
          className="text-ink-soft hover:bg-surface-hover hover:text-ink"
          onSignedOut={onNavigate}
        />
      </div>
    </div>
  );
}
