import {
  BUSINESS_TYPE_LABELS,
  PLATFORM_ACCOUNT_DISPLAY_STATUS_LABELS,
  PlatformAccountDisplayStatus,
  WorkspaceType,
  formatMoney,
} from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePlatformAccount } from '@/features/platform/hooks/use-platform-accounts';
import { ROUTES } from '@/routes/paths';
import { formatDate } from '@/utils/format';

function statusTone(status: PlatformAccountDisplayStatus) {
  if (status === PlatformAccountDisplayStatus.ACTIVE || status === PlatformAccountDisplayStatus.TRIAL) {
    return 'success' as const;
  }
  if (status === PlatformAccountDisplayStatus.PENDING) return 'warning' as const;
  return 'danger' as const;
}

export function PlatformAccountDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const detail = usePlatformAccount(id);
  const data = detail.data;
  const account = data?.account;
  const personal = account?.accountType === WorkspaceType.PERSONAL;

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <Link to={ROUTES.platformAccounts} className="text-sm font-medium text-brand-700 hover:underline">
          {t('common.back')}
        </Link>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-ink">
          {account?.name ?? t('nav.accounts')}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.accounts.detailHint')}</p>
      </div>

      {detail.isPending && !data ? (
        <Skeleton className="h-40 w-full" />
      ) : detail.isError || !account ? (
        <ErrorState
          title={t('platformAdmin.accounts.loadFailed')}
          message={t('common.retry')}
          onRetry={() => void detail.refetch()}
        />
      ) : (
        <>
          <SectionCard title={t('platformAdmin.accounts.infoTitle')}>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-ink-muted">{t('platformAdmin.accounts.colAccount')}</dt>
                <dd className="text-sm font-medium text-ink">{account.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">{t('platformAdmin.accounts.colUser')}</dt>
                <dd className="text-sm font-medium text-ink">
                  {account.ownerName}
                  {account.ownerEmail ? (
                    <span className="block text-xs font-normal text-ink-muted">{account.ownerEmail}</span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">{t('platformAdmin.accounts.colType')}</dt>
                <dd className="text-sm text-ink">
                  {personal ? t('platformAdmin.hub.personal') : t('platformAdmin.hub.business')}
                </dd>
              </div>
              {!personal ? (
                <div>
                  <dt className="text-xs text-ink-muted">{t('platformAdmin.accounts.businessType')}</dt>
                  <dd className="text-sm text-ink">
                    {account.businessType ? BUSINESS_TYPE_LABELS[account.businessType] : '—'}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-ink-muted">{t('common.date')}</dt>
                <dd className="text-sm text-ink">{formatDate(account.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">{t('common.status')}</dt>
                <dd>
                  <Badge tone={statusTone(account.status)}>
                    {PLATFORM_ACCOUNT_DISPLAY_STATUS_LABELS[account.status]}
                  </Badge>
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title={t('nav.subscriptions')}>
            {data.subscription ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-ink-muted">{t('platformAdmin.accounts.colPlan')}</dt>
                  <dd className="text-sm font-medium text-ink">{data.subscription.planName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t('common.status')}</dt>
                  <dd className="text-sm text-ink">
                    {PLATFORM_ACCOUNT_DISPLAY_STATUS_LABELS[data.subscription.status]}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t('platformAdmin.accounts.started')}</dt>
                  <dd className="text-sm text-ink">
                    {data.subscription.startedAt ? formatDate(data.subscription.startedAt) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t('platformAdmin.accounts.expires')}</dt>
                  <dd className="text-sm text-ink">
                    {data.subscription.expiresAt ? formatDate(data.subscription.expiresAt) : '—'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-ink-muted">{t('platformAdmin.accounts.noSubscription')}</p>
            )}
          </SectionCard>

          {!personal ? (
            <SectionCard title={t('platformAdmin.hub.payments')} padded={false}>
              {data.payments.length === 0 ? (
                <p className="px-4 py-3 text-sm text-ink-muted sm:px-5">
                  {t('platformAdmin.accounts.noPayments')}
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.payments.map((payment) => (
                    <li key={payment.id} className="flex justify-between gap-3 px-4 py-3 text-sm sm:px-5">
                      <span className="min-w-0 truncate">
                        {payment.planName}
                        <span className="block text-xs text-ink-muted">{formatDate(payment.createdAt)}</span>
                      </span>
                      <span className="shrink-0 tabular-money">{formatMoney(payment.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          ) : null}

          <SectionCard title={t('nav.referral')}>
            <p className="text-sm text-ink-muted">{t('platformAdmin.accounts.noReferral')}</p>
          </SectionCard>

          <SectionCard title={t('platformAdmin.accounts.activityTitle')} padded={false}>
            <ul className="divide-y divide-line">
              {data.events.map((event) => (
                <li key={`${event.label}-${event.at}`} className="flex justify-between gap-3 px-4 py-3 text-sm sm:px-5">
                  <span>{event.label}</span>
                  <span className="shrink-0 text-ink-muted">{formatDate(event.at)}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </>
      )}
    </PageContainer>
  );
}
