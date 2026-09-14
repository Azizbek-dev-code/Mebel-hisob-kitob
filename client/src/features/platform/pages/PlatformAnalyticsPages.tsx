import { PlatformDatePreset, formatMoney } from '@furniture-erp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { SegmentedNav } from '@/components/ui/SegmentedNav';
import { ROUTES } from '@/routes/paths';

import { PlatformBarChart } from '../components/PlatformBarChart';
import { PlatformDateFilter } from '../components/PlatformDateFilter';
import { usePlatformAnalytics } from '../hooks/use-platform-billing';

export function PlatformAnalyticsPage() {
  return <AnalyticsView />;
}

export function PlatformAnalyticsStoresPage() {
  return <AnalyticsView focus="stores" />;
}

export function PlatformAnalyticsRevenuePage() {
  return <AnalyticsView focus="revenue" />;
}

export function PlatformAnalyticsExpensesPage() {
  return <AnalyticsView focus="expenses" />;
}

export function PlatformAnalyticsProfitPage() {
  return <AnalyticsView focus="profit" />;
}

function AnalyticsView({
  focus = 'all',
}: {
  focus?: 'all' | 'stores' | 'revenue' | 'expenses' | 'profit';
}) {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<string>(PlatformDatePreset.THIS_YEAR);
  const [custom, setCustom] = useState({ from: '', to: '' });
  const range = preset === PlatformDatePreset.CUSTOM ? custom : undefined;
  const analytics = usePlatformAnalytics(preset, true, range);
  const stores = analytics.data?.stores;
  const finance = analytics.data?.finance;
  const accounts = analytics.data?.accounts;

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('platformAdmin.hub.analytics')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.finance.analyticsHint')}</p>
      </div>
      <SegmentedNav
        ariaLabel={t('platformAdmin.hub.analytics')}
        items={[
          { to: ROUTES.platformAnalytics, label: t('platformAdmin.hub.all'), end: true },
          { to: ROUTES.platformAnalyticsStores, label: t('platformAdmin.dashboard.accountGrowth') },
          { to: ROUTES.platformAnalyticsRevenue, label: t('platformAdmin.finance.revenue') },
          { to: ROUTES.platformAnalyticsExpenses, label: t('platformAdmin.finance.expenses') },
          { to: ROUTES.platformAnalyticsProfit, label: t('platformAdmin.finance.net') },
        ]}
      />
      <PlatformDateFilter
        preset={preset}
        onPresetChange={setPreset}
        from={custom.from}
        to={custom.to}
        onCustomChange={setCustom}
      />

      {analytics.isPending && !analytics.data ? (
        <Skeleton className="h-40 w-full" />
      ) : analytics.isError ? (
        <ErrorState
          title={t('platformAdmin.finance.loadFailed')}
          message={t('common.retry')}
          onRetry={() => void analytics.refetch()}
        />
      ) : (
        <>
          {focus === 'all' || focus === 'stores' ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kpi label={t('platformAdmin.hub.personal')} value={String(accounts?.personal ?? 0)} />
                <Kpi label={t('platformAdmin.hub.business')} value={String(accounts?.business ?? 0)} />
                <Kpi label={t('platformAdmin.accounts.active')} value={String(stores?.active ?? 0)} />
                <Kpi label={t('platformAdmin.accounts.blocked')} value={String(stores?.blocked ?? 0)} />
              </div>
              <PlatformBarChart
                title={t('platformAdmin.dashboard.accountGrowth')}
                emptyLabel={t('platformAdmin.dashboard.chartEmpty')}
                series={accounts?.growth ?? []}
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
                series={(analytics.data?.subscriptions.byPlan ?? []).map((row) => ({
                  month: row.planName,
                  storeCount: row.storeCount,
                }))}
                keys={[
                  {
                    key: 'storeCount',
                    label: t('nav.subscriptions'),
                    className: 'bg-brand-500',
                    format: String,
                  },
                ]}
              />
            </>
          ) : null}
          {focus === 'all' || focus === 'revenue' || focus === 'expenses' || focus === 'profit' ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Kpi label={t('platformAdmin.finance.revenue')} value={formatMoney(finance?.revenue ?? 0)} />
                <Kpi label={t('platformAdmin.finance.expenses')} value={formatMoney(finance?.expenses ?? 0)} />
                <Kpi label={t('platformAdmin.finance.net')} value={formatMoney(finance?.netProfit ?? 0)} />
              </div>
              <PlatformBarChart
                title={t('platformAdmin.finance.trendTitle')}
                emptyLabel={t('platformAdmin.finance.trendEmpty')}
                series={finance?.series ?? []}
                keys={[
                  { key: 'revenue', label: t('platformAdmin.finance.revenue'), className: 'bg-success-500' },
                  { key: 'expenses', label: t('platformAdmin.finance.expenses'), className: 'bg-danger-400' },
                  { key: 'netProfit', label: t('platformAdmin.finance.net'), className: 'bg-brand-500' },
                ]}
              />
            </>
          ) : null}
        </>
      )}
    </PageContainer>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-panel border border-line bg-surface p-3 shadow-card">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 truncate text-base font-semibold text-ink">{value}</p>
    </div>
  );
}
