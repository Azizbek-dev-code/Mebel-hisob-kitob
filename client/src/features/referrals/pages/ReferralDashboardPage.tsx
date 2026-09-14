import { formatMoney } from '@furniture-erp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { MetricList, MetricRow } from '@/features/platform/components/MetricList';
import { ApiClientError } from '@/lib/api-client';

import { useMyReferral, useMyReferralWithdrawals, useRequestReferralWithdrawal } from '../hooks/use-referrals';

export function ReferralDashboardPage() {
  const { t } = useTranslation();
  const me = useMyReferral();
  const withdrawals = useMyReferralWithdrawals();
  const request = useRequestReferralWithdrawal();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const data = me.data;

  async function copyLink() {
    if (!data) return;
    const url = `${window.location.origin}${data.path}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  async function onWithdraw() {
    setError(null);
    try {
      await request.mutateAsync();
    } catch (caught) {
              setError(caught instanceof ApiClientError ? caught.message : t('referral.withdrawFailed'));
    }
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('referral.title')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('referral.hint')}</p>
      </div>

      {me.isPending && !data ? (
        <Skeleton className="h-40 w-full" />
      ) : me.isError ? (
        <ErrorState
          title={t('referral.loadFailed')}
          message={t('common.retry')}
          onRetry={() => void me.refetch()}
        />
      ) : data ? (
        <>
          <SectionCard title={t('referral.linkTitle')} description={t('referral.linkHint')}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 truncate rounded-xl bg-surface-muted px-3 py-2 text-sm text-ink">
                {`${typeof window !== 'undefined' ? window.location.origin : ''}${data.path}`}
              </code>
              <button
                type="button"
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                onClick={() => void copyLink()}
              >
                {copied ? t('referral.copied') : t('referral.copy')}
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              {t('referral.commissionRate', { percent: data.commissionPercent })}
            </p>
          </SectionCard>

          <SectionCard title={t('referral.statsTitle')}>
            <MetricList>
              <MetricRow label={t('referral.clicks')} value={String(data.clicks)} />
              <MetricRow label={t('referral.registrations')} value={String(data.registrations)} />
              <MetricRow label={t('referral.firstPayments')} value={String(data.firstPayments)} />
              <MetricRow label={t('referral.conversion')} value={`${data.conversionPercent}%`} />
              <MetricRow label={t('referral.earned')} value={formatMoney(data.earned)} />
              <MetricRow label={t('referral.available')} value={formatMoney(data.available)} />
              <MetricRow label={t('referral.pending')} value={formatMoney(data.pending)} />
              <MetricRow label={t('referral.paid')} value={formatMoney(data.paid)} />
            </MetricList>
          </SectionCard>

          <SectionCard title={t('referral.withdrawTitle')} description={t('referral.withdrawHint', { min: formatMoney(data.minWithdrawal) })}>
            {error ? <p className="mb-3 text-sm text-danger-700">{error}</p> : null}
            <button
              type="button"
              disabled={!data.canWithdraw || request.isPending}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void onWithdraw()}
            >
              {t('referral.withdraw')}
            </button>
          </SectionCard>

          <SectionCard title={t('referral.historyTitle')}>
            {withdrawals.data?.items.length ? (
              <ul className="divide-y divide-line">
                {withdrawals.data.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-3 text-sm">
                    <span>{formatMoney(item.amount)}</span>
                    <span className="text-ink-muted">{t(`referral.status.${item.status}`)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">{t('referral.historyEmpty')}</p>
            )}
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}

export function StoreReferralPage() {
  return (
    <PageContainer className="overflow-x-hidden">
      <ReferralDashboardPage />
    </PageContainer>
  );
}
