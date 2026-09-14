import { formatMoney, ReferralWithdrawalStatus } from '@furniture-erp/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { MetricList, MetricRow } from '@/features/platform/components/MetricList';
import { usePlatformSettings, useUpdatePlatformSettings } from '@/features/platform/hooks/use-platform-billing';
import { ApiClientError } from '@/lib/api-client';

import {
  useApproveReferralWithdrawal,
  usePayReferralWithdrawal,
  useReferralAdminOverview,
  useReferralAdminUsers,
  useReferralAdminWithdrawals,
  useRejectReferralWithdrawal,
} from '@/features/referrals/hooks/use-referrals';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export function PlatformReferralPage() {
  const { t } = useTranslation();
  const overview = useReferralAdminOverview();
  const data = overview.data;

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('nav.referral')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.referral.hint')}</p>
      </div>
      {overview.isPending && !data ? (
        <Skeleton className="h-40 w-full" />
      ) : overview.isError ? (
        <ErrorState
          title={t('platformAdmin.referral.loadFailed')}
          message={t('common.retry')}
          onRetry={() => void overview.refetch()}
        />
      ) : (
        <SectionCard title={t('platformAdmin.referral.overviewTitle')}>
          <MetricList>
            <MetricRow label={t('referral.clicks')} value={String(data?.clicks ?? 0)} />
            <MetricRow label={t('referral.registrations')} value={String(data?.registrations ?? 0)} />
            <MetricRow label={t('referral.conversions')} value={String(data?.conversions ?? 0)} />
            <MetricRow label={t('referral.commissions')} value={formatMoney(data?.commissions ?? 0)} />
            <MetricRow
              label={t('platformAdmin.dashboard.pendingWithdrawals')}
              value={String(data?.pendingWithdrawals ?? 0)}
            />
            <MetricRow
              label={t('referral.paidWithdrawals')}
              value={String(data?.paidWithdrawals ?? 0)}
            />
          </MetricList>
        </SectionCard>
      )}
    </PageContainer>
  );
}

export function PlatformReferralUsersPage() {
  const { t } = useTranslation();
  const users = useReferralAdminUsers();

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('platformAdmin.hub.users')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.referral.usersHint')}</p>
      </div>
      {users.isPending && !users.data ? (
        <Skeleton className="h-40 w-full" />
      ) : users.isError ? (
        <ErrorState
          title={t('platformAdmin.referral.loadFailed')}
          message={t('common.retry')}
          onRetry={() => void users.refetch()}
        />
      ) : (
        <SectionCard title={t('platformAdmin.referral.usersTitle')}>
          {users.data?.items.length ? (
            <ul className="divide-y divide-line">
              {users.data.items.map((row) => (
                <li key={row.identityId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium text-ink">{row.ownerName}</p>
                    <p className="text-xs text-ink-muted">{row.code}</p>
                  </div>
                  <div className="text-right text-ink-muted">
                    <p>{t('referral.referralsCount', { count: row.referrals })}</p>
                    <p>{formatMoney(row.earned)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">{t('platformAdmin.referral.emptyTitle')}</p>
          )}
        </SectionCard>
      )}
    </PageContainer>
  );
}

export function PlatformReferralWithdrawalsPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ReferralWithdrawalStatus | undefined>(
    ReferralWithdrawalStatus.PENDING,
  );
  const list = useReferralAdminWithdrawals(status);
  const approve = useApproveReferralWithdrawal();
  const reject = useRejectReferralWithdrawal();
  const pay = usePayReferralWithdrawal();
  const [reason, setReason] = useState('');

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('platformAdmin.hub.withdrawals')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.referral.withdrawalsHint')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED', 'PAID'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              status === value ? 'bg-brand-600 text-white' : 'bg-surface-muted text-ink-muted'
            }`}
            onClick={() => setStatus(value)}
          >
            {t(`referral.status.${value}`)}
          </button>
        ))}
      </div>
      {list.isPending && !list.data ? (
        <Skeleton className="h-40 w-full" />
      ) : list.isError ? (
        <ErrorState
          title={t('platformAdmin.referral.loadFailed')}
          message={t('common.retry')}
          onRetry={() => void list.refetch()}
        />
      ) : (
        <SectionCard title={t('platformAdmin.referral.withdrawalsTitle')}>
          {list.data?.items.length ? (
            <ul className="divide-y divide-line">
              {list.data.items.map((item) => (
                <li key={item.id} className="space-y-2 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span>{formatMoney(item.amount)}</span>
                    <span className="text-ink-muted">{t(`referral.status.${item.status}`)}</span>
                  </div>
                  {item.status === ReferralWithdrawalStatus.PENDING ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs text-white"
                        onClick={() => void approve.mutateAsync(item.id)}
                      >
                        {t('referral.approve')}
                      </button>
                      <input
                        className={fieldClass}
                        placeholder={t('referral.rejectReason')}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      />
                      <button
                        type="button"
                        className="rounded-lg border border-line px-3 py-1.5 text-xs"
                        onClick={() =>
                          void reject.mutateAsync({ id: item.id, body: { reason: reason || 'Rad etildi' } })
                        }
                      >
                        {t('referral.reject')}
                      </button>
                    </div>
                  ) : null}
                  {item.status === ReferralWithdrawalStatus.APPROVED ? (
                    <button
                      type="button"
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs text-white"
                      onClick={() => void pay.mutateAsync(item.id)}
                    >
                      {t('referral.markPaid')}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">{t('platformAdmin.referral.emptyTitle')}</p>
          )}
        </SectionCard>
      )}
    </PageContainer>
  );
}

export function PlatformReferralSettingsPage() {
  const { t } = useTranslation();
  const query = usePlatformSettings();
  const save = useUpdatePlatformSettings();
  const settings = query.data?.settings;
  const [percent, setPercent] = useState(10);
  const [minWithdrawal, setMinWithdrawal] = useState(100000);
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setPercent(settings.referralCommissionPercent);
    setMinWithdrawal(settings.referralMinWithdrawalSom);
    setActive(settings.referralProgramActive);
  }, [settings]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await save.mutateAsync({
        referralCommissionPercent: percent,
        referralMinWithdrawalSom: minWithdrawal,
        referralProgramActive: active,
      });
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : t('referral.saveFailed'));
    }
  }

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('nav.settings')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.referral.settingsHint')}</p>
      </div>
      {query.isPending && !settings ? (
        <Skeleton className="h-40 w-full" />
      ) : query.isError ? (
        <ErrorState
          title={t('platformAdmin.referral.loadFailed')}
          message={t('common.retry')}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <SectionCard title={t('platformAdmin.referral.settingsTitle')}>
          <form className="max-w-lg space-y-3" onSubmit={(event) => void onSubmit(event)}>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">{t('referral.commissionPercent')}</span>
              <input
                type="number"
                min={0}
                max={100}
                className={fieldClass}
                value={percent}
                onChange={(event) => setPercent(Number(event.target.value))}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">{t('referral.minWithdrawal')}</span>
              <input
                type="number"
                min={0}
                className={fieldClass}
                value={minWithdrawal}
                onChange={(event) => setMinWithdrawal(Number(event.target.value))}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
              <span>{t('referral.programActive')}</span>
            </label>
            {error ? <p className="text-sm text-danger-700">{error}</p> : null}
            {saved ? <p className="text-sm text-brand-700">{t('referral.saved')}</p> : null}
            <button
              type="submit"
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white"
              disabled={save.isPending}
            >
              {t('common.save')}
            </button>
          </form>
        </SectionCard>
      )}
    </PageContainer>
  );
}
