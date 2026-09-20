import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBusinessUnreadCount } from '@/features/notifications/use-business-notifications';
import { ResponsibilityBadges } from '@/features/workers/components/ResponsibilityBadges';
import { WorkerAttributedFeesPanel } from '@/features/workers/components/WorkerAttributedFeesPanel';
import { WorkerProfileModulesPanel } from '@/features/workers/components/WorkerProfileModulesPanel';
import { useMyAttributedFees, useMyProfileModules } from '@/features/workers/hooks/use-workers';
import { ROUTES } from '@/routes/paths';
import { formatDate } from '@/utils/format';

export function ProfilePage() {
  const { t } = useTranslation();
  const modulesQuery = useMyProfileModules();
  const feesQuery = useMyAttributedFees();
  const unread = useBusinessUnreadCount();

  if (modulesQuery.isError && !modulesQuery.data) {
    return (
      <PageContainer>
        <ErrorState
          title="Profil yuklanmadi"
          message={
            modulesQuery.error instanceof Error
              ? modulesQuery.error.message
              : "Profil ma'lumotlarini yuklab bo'lmadi."
          }
          retryLabel="Qayta urinish"
          onRetry={() => void modulesQuery.refetch()}
        />
      </PageContainer>
    );
  }

  if (modulesQuery.isLoading || !modulesQuery.data) {
    return (
      <PageContainer>
        <Skeleton className="h-48 w-full" />
      </PageContainer>
    );
  }

  const modules = modulesQuery.data;
  const worker = modules.worker;
  const links = [
    { to: ROUTES.settingsAccount, labelKey: 'settings.hubAccount', hintKey: 'settings.hubAccountHint' },
    { to: ROUTES.settingsSecurity, labelKey: 'settings.hubSecurity', hintKey: 'settings.hubSecurityHint' },
    { to: ROUTES.notifications, labelKey: 'settings.hubNotifications', hintKey: 'settings.hubNotificationsHint' },
    { to: ROUTES.profileFinances, labelKey: 'nav.myFinances', hintKey: 'settings.hubAccountHint' },
    { to: ROUTES.settingsDanger, labelKey: 'settings.hubDanger', hintKey: 'settings.hubDangerHint' },
  ];

  return (
    <PageContainer className="space-y-5">
      <section className="rounded-2xl border border-line bg-surface px-4 py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-ink">{worker.fullName}</h2>
            <p className="mt-1 text-sm text-ink-muted">
              @{worker.username ?? '—'}
              {worker.phone ? ` · ${worker.phone}` : ''} · {formatDate(worker.createdAt)}
            </p>
            <div className="mt-2">
              <ResponsibilityBadges responsibilities={worker.responsibilities} />
            </div>
          </div>
          <Badge tone={worker.isActive ? 'success' : 'neutral'}>
            {worker.isActive ? 'Faol' : 'Nofaol'}
          </Badge>
        </div>
      </section>

      <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
        {links.map((item) => (
          <li key={item.to} className="border-b border-line last:border-b-0">
            <Link to={item.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover">
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
        ))}
      </ul>

      <WorkerProfileModulesPanel
        modules={modules}
        isLoading={modulesQuery.isLoading}
        isError={modulesQuery.isError}
        onRetry={() => void modulesQuery.refetch()}
      />

      <WorkerAttributedFeesPanel
        fees={feesQuery.data}
        isLoading={feesQuery.isLoading}
        isError={feesQuery.isError}
        onRetry={() => void feesQuery.refetch()}
        linkReferences
      />
    </PageContainer>
  );
}
