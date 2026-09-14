import { PlatformDatePreset, formatMoney } from '@furniture-erp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/routes/paths';

import { MetricList, MetricRow } from '../components/MetricList';
import { PlatformBarChart } from '../components/PlatformBarChart';
import { PlatformDateFilter } from '../components/PlatformDateFilter';
import { usePlatformDashboard } from '../hooks/use-platform-billing';

export function PlatformDashboardPage() {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<string>(PlatformDatePreset.LAST_30_DAYS);
  const [custom, setCustom] = useState({ from: '', to: '' });
  const range = preset === PlatformDatePreset.CUSTOM ? custom : undefined;
  const dashboard = usePlatformDashboard(true, preset, range);
  const data = dashboard.data;
  const loading = dashboard.isPending && !data;

  const businessTotal = data?.totalStores ?? 0;
  const personalTotal = data?.personalWorkspaces ?? 0;
  const split =
    personalTotal + businessTotal > 0
      ? [
          {
            month: t('platformAdmin.dashboard.now'),
            personal: personalTotal,
            business: businessTotal,
          },
        ]
      : [];

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('nav.dashboard')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.dashboard.hint')}</p>
      </div>

      <PlatformDateFilter
        preset={preset}
        onPresetChange={setPreset}
        from={custom.from}
        to={custom.to}
        onCustomChange={setCustom}
      />

      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          <SectionCard
            title={t('platformAdmin.dashboard.overviewTitle')}
            description={data?.period.label ?? t('platformAdmin.dashboard.overviewHint')}
          >
            <MetricList>
              <MetricRow
                label={t('platformAdmin.accounts.total')}
                value={String(businessTotal + personalTotal)}
                to={ROUTES.platformAccounts}
                hint={t('platformAdmin.accounts.totalHint')}
              />
              <MetricRow
                label={t('platformAdmin.accounts.active')}
                value={String((data?.activeStores ?? 0) + (data?.personalActive ?? 0))}
                to={ROUTES.platformAccounts}
              />
              <MetricRow
                label={t('platformAdmin.accounts.trial')}
                value={String((data?.trialStores ?? 0) + (data?.personalTrial ?? 0))}
                to={ROUTES.platformSubscriptions}
              />
              <MetricRow
                label={t('platformAdmin.accounts.pending')}
                value={String(data?.pendingStoreRequests ?? 0)}
                to={`${ROUTES.platformAccounts}?status=PENDING`}
              />
            </MetricList>
          </SectionCard>

          <SectionCard title={t('platformAdmin.accounts.breakdownTitle')}>
            <MetricList>
              <MetricRow
                label={t('platformAdmin.hub.personal')}
                value={String(personalTotal)}
                to={ROUTES.platformAccountsPersonal}
              />
              <MetricRow
                label={t('platformAdmin.hub.business')}
                value={String(businessTotal)}
                to={ROUTES.platformAccountsBusiness}
              />
            </MetricList>
          </SectionCard>

          <SectionCard title={t('platformAdmin.dashboard.pendingTitle')}>
            <MetricList>
              <MetricRow
                label={t('platformAdmin.dashboard.pendingAccounts')}
                value={String(data?.pendingStoreRequests ?? 0)}
                to={`${ROUTES.platformAccounts}?status=PENDING`}
              />
              <MetricRow
                label={t('platformAdmin.dashboard.pendingRequests')}
                value={String(data?.pendingSubscriptionRequests ?? 0)}
                to={ROUTES.platformSubscriptionRequests}
              />
              <MetricRow
                label={t('platformAdmin.dashboard.pendingPayments')}
                value={String(data?.pendingPayments ?? 0)}
                to={ROUTES.platformPaymentsPending}
                hint={data ? formatMoney(data.pendingPaymentAmount) : undefined}
              />
              <MetricRow
                label={t('platformAdmin.dashboard.pendingWithdrawals')}
                value={String(data?.pendingWithdrawals ?? 0)}
                hint={t('platformAdmin.dashboard.pendingWithdrawalsHint')}
              />
            </MetricList>
          </SectionCard>

          <SectionCard title={t('nav.finance')} description={data?.period.label}>
            <MetricList>
              <MetricRow
                label={t('platformAdmin.finance.revenue')}
                value={data ? formatMoney(data.monthRevenue) : '0'}
                to={ROUTES.platformFinance}
              />
              <MetricRow
                label={t('platformAdmin.finance.expenses')}
                value={data ? formatMoney(data.monthExpenses) : '0'}
                to={ROUTES.platformExpenses}
              />
              <MetricRow
                label={t('platformAdmin.finance.net')}
                value={data ? formatMoney(data.monthNetProfit) : '0'}
                to={ROUTES.platformPnl}
              />
            </MetricList>
          </SectionCard>

          <SectionCard title={t('nav.subscriptions')}>
            <MetricList>
              <MetricRow
                label={t('platformAdmin.accounts.active')}
                value={String((data?.activeSubscriptions ?? 0) + (data?.personalActive ?? 0))}
                to={ROUTES.platformSubscriptions}
              />
              <MetricRow
                label={t('platformAdmin.accounts.trial')}
                value={String((data?.trialStores ?? 0) + (data?.personalTrial ?? 0))}
                to={ROUTES.platformSubscriptions}
              />
              <MetricRow
                label={t('nav.referral')}
                value={String(data?.referralSignups ?? 0)}
                to={ROUTES.platformReferral}
                hint={t('platformAdmin.dashboard.referralHint')}
              />
            </MetricList>
          </SectionCard>

          <PlatformBarChart
            title={t('platformAdmin.finance.trendTitle')}
            emptyLabel={t('platformAdmin.finance.trendEmpty')}
            series={data?.pnlSeries ?? []}
            keys={[
              { key: 'revenue', label: t('platformAdmin.finance.revenue'), className: 'bg-success-500' },
              { key: 'expenses', label: t('platformAdmin.finance.expenses'), className: 'bg-danger-400' },
              { key: 'netProfit', label: t('platformAdmin.finance.net'), className: 'bg-brand-500' },
            ]}
          />

          <PlatformBarChart
            title={t('platformAdmin.dashboard.accountGrowth')}
            emptyLabel={t('platformAdmin.dashboard.chartEmpty')}
            series={data?.accountGrowth ?? []}
            keys={[
              {
                key: 'personal',
                label: t('platformAdmin.hub.personal'),
                className: 'bg-info-500',
                format: String,
              },
              {
                key: 'business',
                label: t('platformAdmin.hub.business'),
                className: 'bg-brand-500',
                format: String,
              },
            ]}
          />

          <PlatformBarChart
            title={t('platformAdmin.dashboard.personalVsBusiness')}
            emptyLabel={t('platformAdmin.dashboard.chartEmpty')}
            series={split}
            keys={[
              {
                key: 'personal',
                label: t('platformAdmin.hub.personal'),
                className: 'bg-info-500',
                format: String,
              },
              {
                key: 'business',
                label: t('platformAdmin.hub.business'),
                className: 'bg-brand-500',
                format: String,
              },
            ]}
          />

          <PlatformBarChart
            title={t('platformAdmin.dashboard.planMix')}
            emptyLabel={t('platformAdmin.dashboard.chartEmpty')}
            series={(data?.subscriptionByPlan ?? []).map((row) => ({
              month: row.planName,
              storeCount: row.storeCount,
            }))}
            keys={[
              {
                key: 'storeCount',
                label: t('platformAdmin.accounts.total'),
                className: 'bg-brand-500',
                format: String,
              },
            ]}
          />
        </>
      )}
    </PageContainer>
  );
}
