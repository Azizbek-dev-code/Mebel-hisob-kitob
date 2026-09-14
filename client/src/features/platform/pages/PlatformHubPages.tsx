import { formatMoney } from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { MetricList, MetricRow } from '@/features/platform/components/MetricList';
import { usePlatformDashboard } from '@/features/platform/hooks/use-platform-billing';
import { ROUTES } from '@/routes/paths';

export { PlatformAccountsPage as PlatformAccountsOverviewPage } from './PlatformAccountsPage';

export function PlatformSubscriptionsOverviewPage() {
  const { t } = useTranslation();
  const dashboard = usePlatformDashboard(true);
  const stores = dashboard.data;
  const loading = dashboard.isPending && !stores;

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('nav.subscriptions')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.subscriptions.hint')}</p>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : dashboard.isError ? (
        <ErrorState
          title={t('platformAdmin.subscriptions.loadFailed')}
          message={t('common.retry')}
          onRetry={() => void dashboard.refetch()}
        />
      ) : (
        <>
          <SectionCard title={t('platformAdmin.subscriptions.businessTitle')}>
            <MetricList>
              <MetricRow
                label={t('platformAdmin.accounts.active')}
                value={String(stores?.activeSubscriptions ?? 0)}
              />
              <MetricRow
                label={t('platformAdmin.accounts.trial')}
                value={String(stores?.trialStores ?? 0)}
              />
              <MetricRow
                label={t('platformAdmin.accounts.expired')}
                value={String(stores?.expiredStores ?? 0)}
              />
              <MetricRow
                label={t('platformAdmin.subscriptions.pendingPayment')}
                value={String(stores?.pendingPaymentStores ?? 0)}
                to={ROUTES.platformPaymentsPending}
              />
              <MetricRow
                label={t('platformAdmin.subscriptions.pendingRequests')}
                value={String(stores?.pendingBusinessSubscriptionRequests ?? 0)}
                to={ROUTES.platformSubscriptionRequests}
              />
              <MetricRow
                label={t('platformAdmin.subscriptions.revenue')}
                value={formatMoney(stores?.subscriptionRevenueTotal ?? 0)}
                to={ROUTES.platformPayments}
                hint={t('platformAdmin.subscriptions.revenueHint')}
              />
            </MetricList>
          </SectionCard>
          <SectionCard title={t('platformAdmin.subscriptions.personalTitle')}>
            <MetricList>
              <MetricRow
                label={t('platformAdmin.accounts.active')}
                value={String(stores?.personalActive ?? 0)}
              />
              <MetricRow
                label={t('platformAdmin.accounts.trial')}
                value={String(stores?.personalTrial ?? 0)}
              />
              <MetricRow
                label={t('platformAdmin.accounts.expired')}
                value={String(stores?.personalExpired ?? 0)}
              />
              <MetricRow
                label={t('platformAdmin.subscriptions.pendingRequests')}
                value={String(stores?.pendingPersonalSubscriptionRequests ?? 0)}
                to={ROUTES.platformSubscriptionRequests}
              />
              <MetricRow
                label={t('platformAdmin.subscriptions.revenue')}
                value="—"
                hint={t('platformAdmin.subscriptions.personalRevenueHint')}
              />
            </MetricList>
          </SectionCard>
        </>
      )}
    </PageContainer>
  );
}

export function PlatformFinanceOverviewPage() {
  const { t } = useTranslation();
  const dashboard = usePlatformDashboard(true);
  const stores = dashboard.data;

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('nav.finance')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.finance.hint')}</p>
      </div>

      {dashboard.isPending && !stores ? (
        <Skeleton className="h-40 w-full" />
      ) : dashboard.isError ? (
        <ErrorState
          title={t('platformAdmin.finance.loadFailed')}
          message={t('common.retry')}
          onRetry={() => void dashboard.refetch()}
        />
      ) : (
        <SectionCard
          title={t('platformAdmin.finance.thisMonth')}
          description={t('platformAdmin.finance.thisMonthHint')}
        >
          <MetricList>
            <MetricRow
              label={t('platformAdmin.finance.revenue')}
              value={formatMoney(stores?.monthRevenue ?? 0)}
              to={ROUTES.platformFinanceIncome}
            />
            <MetricRow
              label={t('platformAdmin.finance.expenses')}
              value={formatMoney(stores?.monthExpenses ?? 0)}
              to={ROUTES.platformExpenses}
            />
            <MetricRow
              label={t('platformAdmin.finance.net')}
              value={formatMoney(stores?.monthNetProfit ?? 0)}
              to={ROUTES.platformPnl}
            />
          </MetricList>
        </SectionCard>
      )}
    </PageContainer>
  );
}

export function PlatformFinanceIncomePage() {
  const { t } = useTranslation();
  const dashboard = usePlatformDashboard(true);
  const stores = dashboard.data;

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('platformAdmin.hub.income')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.finance.incomeHint')}</p>
      </div>

      {dashboard.isPending && !stores ? (
        <Skeleton className="h-32 w-full" />
      ) : dashboard.isError ? (
        <ErrorState
          title={t('platformAdmin.finance.loadFailed')}
          message={t('common.retry')}
          onRetry={() => void dashboard.refetch()}
        />
      ) : (
        <SectionCard title={t('platformAdmin.finance.sources')}>
          <MetricList>
            <MetricRow
              label={t('platformAdmin.finance.businessSubs')}
              value={formatMoney(stores?.subscriptionRevenueTotal ?? 0)}
              to={ROUTES.platformPayments}
              hint={t('platformAdmin.finance.businessSubsHint')}
            />
            <MetricRow
              label={t('platformAdmin.finance.otherRevenue')}
              value={formatMoney(stores?.otherRevenue ?? 0)}
              hint={t('platformAdmin.finance.otherRevenueHint')}
            />
            <MetricRow
              label={t('platformAdmin.finance.personalSubs')}
              value="—"
              hint={t('platformAdmin.finance.personalSubsHint')}
            />
          </MetricList>
        </SectionCard>
      )}
    </PageContainer>
  );
}
