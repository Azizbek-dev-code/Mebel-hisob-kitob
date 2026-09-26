import { WorkspaceType, isPersonalAuth } from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { SignOutButton } from '@/components/layout/SignOutButton';
import { AccountSwitcher } from '@/features/accounts/components/AccountSwitcher';
import { AccountWorkspaceList, currentWorkspaceId } from '@/features/accounts/components/AccountWorkspaceList';
import { useAccountWorkspaces } from '@/features/accounts/hooks/use-accounts';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { HubLinkList, type HubLinkItem } from '@/features/personal/components/HubLinkList';
import { useGrowthProgress } from '@/features/personal/growth/hooks/use-growth-xp';
import { ROUTES } from '@/routes/paths';

const SOCIAL_LINKS: readonly HubLinkItem[] = [
  { to: ROUTES.personalGrowthFriends, labelKey: 'personal.growth.friends', hintKey: 'personal.growth.friendsHint' },
  { to: ROUTES.personalGrowthSocial, labelKey: 'personal.growth.social', hintKey: 'personal.growth.socialHint' },
  { to: ROUTES.personalGrowthChallenges, labelKey: 'personal.growth.challenge', hintKey: 'personal.growth.challengeHint' },
];

const FINANCE_SETTINGS_LINKS: readonly HubLinkItem[] = [
  { to: ROUTES.personalCategories, labelKey: 'personal.categories', hintKey: 'personal.categoriesHint' },
  { to: ROUTES.personalRecurring, labelKey: 'personal.recurring', hintKey: 'personal.recurringHint' },
];

const ACCOUNT_LINKS: readonly HubLinkItem[] = [
  { to: ROUTES.personalNotifications, labelKey: 'personal.notifications', hintKey: 'personal.notificationsHint' },
  { to: ROUTES.personalBilling, labelKey: 'personal.billingTitle', hintKey: 'personal.billingHint' },
  { to: ROUTES.personalReferral, labelKey: 'personal.referralTitle', hintKey: 'personal.referralHint' },
];

export function PersonalSettingsPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const accounts = useAccountWorkspaces();
  const progress = useGrowthProgress();
  const items = accounts.data?.items ?? [];
  const current = items.find((item) => item.id === currentWorkspaceId(user, items));
  const currentName = current
    ? current.type === WorkspaceType.PERSONAL
      ? t('personal.switchPersonal')
      : current.name
    : user && isPersonalAuth(user)
      ? t('personal.switchPersonal')
      : (user?.storeName ?? t('personal.switchPersonal'));
  const remainingXp =
    progress.data != null ? Math.max(0, progress.data.xpForNextLevel - progress.data.xpIntoLevel) : 0;

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <h1 className="pf-page-title">{t('personal.navProfile')}</h1>
        <p className="pf-page-hint">{t('personal.profileHint')}</p>
      </div>

      <section className="pf-card px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold tracking-tight text-ink">
              {user?.fullName || currentName}
            </p>
            {user?.email ? <p className="mt-0.5 truncate text-xs text-ink-muted">{user.email}</p> : null}
            <p className="mt-2 inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
              {t('personal.switchPersonal')}
              {user?.fullName ? ` · ${user.fullName.split(' ')[0]}` : ''}
            </p>
            {progress.data ? (
              <div className="mt-4 space-y-1.5">
                <p className="text-sm font-semibold text-ink">
                  {t('personal.levelLabel', { level: progress.data.level })}
                </p>
                <p className="text-xs tabular-nums text-ink-muted">
                  XP: {progress.data.xpIntoLevel.toLocaleString()} / {progress.data.xpForNextLevel.toLocaleString()}
                </p>
                <div className="pf-progress-track">
                  <div
                    className="pf-progress-fill"
                    style={{ width: `${Math.min(100, progress.data.percent)}%` }}
                  />
                </div>
                <p className="text-xs text-ink-muted">
                  {t('personal.xpToNext', { xp: remainingXp.toLocaleString() })}
                </p>
              </div>
            ) : null}
          </div>
          <AccountSwitcher variant="avatar" includeSessionActions />
        </div>
      </section>

      <section className="pf-card px-4 py-3.5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{t('personal.currentAccount')}</p>
        <p className="mt-1 text-sm font-semibold text-ink">{currentName}</p>
        <div className="mt-3 border-t border-line pt-3">
          <AccountWorkspaceList />
        </div>
      </section>

      <HubLinkList
        items={[
          { to: ROUTES.personalProfileEdit, labelKey: 'auth.profileDetails', hintKey: 'auth.profileDetailsHint' },
          { to: ROUTES.personalSecurity, labelKey: 'auth.security', hintKey: 'auth.securityHint' },
          { to: ROUTES.personalPrivacy, labelKey: 'personal.privacyTitle', hintKey: 'personal.privacyHint' },
          { to: ROUTES.personalFeedback, labelKey: 'personal.feedbackTitle', hintKey: 'personal.feedbackHint' },
        ]}
      />

      <div>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {t('personal.growth.friends')}
        </h2>
        <HubLinkList items={SOCIAL_LINKS} />
      </div>

      <div>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {t('personal.financeSettings')}
        </h2>
        <HubLinkList items={FINANCE_SETTINGS_LINKS} />
      </div>

      <HubLinkList items={ACCOUNT_LINKS} />

      <section className="pf-card px-4 py-3.5">
        <p className="text-xs text-ink-muted">{t('lang.switch')}</p>
        <div className="mt-1.5">
          <LanguageSwitcher />
        </div>
      </section>

      <div className="pf-card px-2 py-1">
        <SignOutButton className="text-danger-700 hover:bg-danger-50" />
      </div>
    </div>
  );
}
