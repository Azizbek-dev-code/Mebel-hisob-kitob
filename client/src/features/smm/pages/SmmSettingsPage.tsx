import { Bell, Building2, CreditCard, Globe, Lock, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { useBusinessUnreadCount } from '@/features/notifications/use-business-notifications';
import { canManageSettings } from '@/features/settings/pages/SettingsPage';
import { ROUTES } from '@/routes/paths';

type HubLink = {
  to: string;
  labelKey: string;
  hintKey: string;
  icon: typeof UserRound;
  show?: boolean;
};

export function SmmSettingsPage() {
  const { t } = useTranslation();
  const { data: currentUser, isPending } = useCurrentUser();
  const editable = canManageSettings(currentUser?.role);
  const unread = useBusinessUnreadCount();

  const links: HubLink[] = [
    {
      to: ROUTES.profile,
      labelKey: 'smm.settingsProfile',
      hintKey: 'smm.settingsProfileHint',
      icon: UserRound,
    },
    {
      to: ROUTES.settingsShop,
      labelKey: 'smm.settingsAgency',
      hintKey: 'smm.settingsAgencyHint',
      icon: Building2,
      show: editable,
    },
    {
      to: ROUTES.notifications,
      labelKey: 'settings.hubNotifications',
      hintKey: 'settings.hubNotificationsHint',
      icon: Bell,
    },
    {
      to: ROUTES.billing,
      labelKey: 'settings.hubBilling',
      hintKey: 'settings.hubBillingHint',
      icon: CreditCard,
      show: editable,
    },
    {
      to: ROUTES.settingsSecurity,
      labelKey: 'settings.hubSecurity',
      hintKey: 'settings.hubSecurityHint',
      icon: Lock,
    },
    {
      to: ROUTES.settingsAccount,
      labelKey: 'settings.hubAccount',
      hintKey: 'settings.hubAccountHint',
      icon: UserRound,
    },
  ];

  if (isPending) {
    return (
      <PageContainer>
        <Skeleton className="h-48 w-full" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('smm.settingsTitle')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('smm.settingsSubtitle')}</p>
      </div>

      <section className="rounded-2xl border border-line bg-surface px-4 py-3.5">
        <p className="truncate text-lg font-semibold text-ink">
          {currentUser?.fullName ?? t('nav.settings')}
        </p>
        {currentUser?.email ? (
          <p className="mt-0.5 truncate text-xs text-ink-muted">{currentUser.email}</p>
        ) : null}
        {currentUser && 'storeName' in currentUser && currentUser.storeName ? (
          <p className="mt-1 text-sm text-ink-muted">{currentUser.storeName}</p>
        ) : null}
      </section>

      <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
        {links
          .filter((item) => item.show !== false)
          .map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to} className="border-b border-line last:border-b-0">
                <Link to={item.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-input bg-surface-muted text-ink-soft">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="block text-sm font-medium text-ink">{t(item.labelKey)}</span>
                      {item.to === ROUTES.notifications && unread.badge ? (
                        <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                          {unread.badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-muted">{t(item.hintKey)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
      </ul>

      <SectionCard title={t('smm.settingsLanguage')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-input bg-surface-muted text-ink-soft">
              <Globe className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">{t('lang.switch')}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{t('smm.settingsLanguageHint')}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </SectionCard>
    </PageContainer>
  );
}
