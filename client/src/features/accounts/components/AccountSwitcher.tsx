import { WorkspaceType, isPersonalAuth } from '@furniture-erp/shared';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { SignOutButton } from '@/components/layout/SignOutButton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { initialsOf } from '@/utils/format';

import { AccountWorkspaceList, currentWorkspaceId } from './AccountWorkspaceList';
import { useAccountWorkspaces } from '../hooks/use-accounts';

export function AccountSwitcher({
  variant = 'avatar',
  includeSessionActions = false,
}: {
  variant?: 'avatar' | 'sidebar';
  includeSessionActions?: boolean;
}) {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const accounts = useAccountWorkspaces();
  const [isOpen, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const items = accounts.data?.items ?? [];
  const current = items.find((item) => item.id === currentWorkspaceId(user, items));

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  const label = current
    ? current.type === WorkspaceType.PERSONAL
      ? t('personal.switchPersonal')
      : current.name
    : isPersonalAuth(user)
      ? t('personal.switchPersonal')
      : user.storeName;

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t('personal.switchAccount')}
        data-testid="account-switcher"
        className={cn(
          'flex min-w-0 items-center gap-2 rounded-input transition-colors hover:bg-surface-hover',
          variant === 'sidebar' ? 'w-full px-2 py-1.5' : 'p-0.5',
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
          {initialsOf(user.fullName)}
        </span>
        {variant === 'sidebar' ? (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink">{label}</span>
            <ChevronDown
              className={cn('size-4 shrink-0 text-ink-subtle transition-transform', isOpen && 'rotate-180')}
              aria-hidden="true"
            />
          </>
        ) : null}
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={t('personal.accountMenu')}
          className={cn(
            'absolute z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-card border border-line bg-surface p-1.5 shadow-overlay',
            variant === 'sidebar' ? 'bottom-full left-0 mb-2 mt-0' : 'right-0 top-full',
          )}
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-ink">{user.fullName}</p>
            <p className="mt-0.5 truncate text-xs text-ink-muted">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <AccountWorkspaceList onPicked={() => setOpen(false)} />
          {includeSessionActions ? (
            <>
              <div className="my-1 h-px bg-line" />
              <Link
                role="menuitem"
                to={isPersonalAuth(user) ? ROUTES.personalSettings : ROUTES.profile}
                onClick={() => setOpen(false)}
                className="flex w-full items-center rounded-input px-2.5 py-2 text-sm text-ink-soft hover:bg-surface-hover hover:text-ink"
              >
                {t('auth.profile')}
              </Link>
              <div className="px-2.5 py-2">
                <LanguageSwitcher />
              </div>
              <SignOutButton
                className="text-ink-soft hover:bg-surface-hover hover:text-ink"
                onSignedOut={() => setOpen(false)}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
