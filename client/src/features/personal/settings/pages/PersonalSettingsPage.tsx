import { WorkspaceType, isPersonalAuth } from '@furniture-erp/shared';
import { Building2, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { SignOutButton } from '@/components/layout/SignOutButton';
import { AccountSwitcher } from '@/features/accounts/components/AccountSwitcher';
import { AccountWorkspaceList, currentWorkspaceId } from '@/features/accounts/components/AccountWorkspaceList';
import { useAccountWorkspaces } from '@/features/accounts/hooks/use-accounts';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ROUTES } from '@/routes/paths';

const LINKS = [
  { to: ROUTES.personalAccounts, labelKey: 'personal.wallets', hintKey: 'personal.walletsHint' },
  { to: ROUTES.personalCategories, labelKey: 'personal.categories', hintKey: 'personal.categoriesHint' },
  { to: ROUTES.personalRecurring, labelKey: 'personal.recurring', hintKey: 'personal.recurringHint' },
  { to: ROUTES.personalDebts, labelKey: 'personal.debts', hintKey: 'personal.debtsHint' },
  { to: ROUTES.personalNotifications, labelKey: 'personal.notifications', hintKey: 'personal.notificationsHint' },
  { to: ROUTES.personalAnalytics, labelKey: 'personal.analytics', hintKey: 'personal.analyticsHint' },
  { to: ROUTES.personalBilling, labelKey: 'personal.billingTitle', hintKey: 'personal.billingHint' },
  { to: ROUTES.personalReferral, labelKey: 'personal.referralTitle', hintKey: 'personal.referralHint' },
] as const;

export function PersonalSettingsPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const accounts = useAccountWorkspaces();
  const items = accounts.data?.items ?? [];
  const current = items.find((item) => item.id === currentWorkspaceId(user, items));
  const currentName = current
    ? current.type === WorkspaceType.PERSONAL
      ? t('personal.switchPersonal')
      : current.name
    : user && isPersonalAuth(user)
      ? t('personal.switchPersonal')
      : (user?.storeName ?? t('personal.switchPersonal'));

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.settings')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.settingsHint')}</p>
        <p className="mt-2 rounded-xl border border-line bg-surface-muted px-3 py-2 text-sm text-ink-soft">
          {t('personal.walletsVsCategories')}
        </p>
      </div>

      <section className="rounded-2xl border border-line bg-surface px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {t('personal.currentAccount')}
            </p>
            <p className="mt-1 text-sm font-medium text-ink">{currentName}</p>
            {user?.email ? <p className="mt-0.5 truncate text-xs text-ink-muted">{user.email}</p> : null}
          </div>
          <AccountSwitcher variant="avatar" includeSessionActions />
        </div>
        <div className="mt-3 border-t border-line pt-3">
          <AccountWorkspaceList />
        </div>
        <div className="mt-3">
          <p className="text-xs text-ink-muted">{t('lang.switch')}</p>
          <div className="mt-1.5">
            <LanguageSwitcher />
          </div>
        </div>
      </section>

      <Link
        to={ROUTES.onboarding}
        data-testid="add-account"
        className="flex items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-surface px-4 py-3.5 hover:bg-surface-hover"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Building2 className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">{t('personal.addAccount')}</span>
          <span className="mt-0.5 block text-xs text-ink-muted">{t('personal.addAccountHint')}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
      </Link>

      <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
        {LINKS.map((item) => (
          <li key={item.to} className="border-b border-line last:border-b-0">
            <Link to={item.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{t(item.labelKey)}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{t(item.hintKey)}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-line bg-surface px-2 py-1">
        <SignOutButton className="text-danger-700 hover:bg-danger-50" />
      </div>
    </div>
  );
}
