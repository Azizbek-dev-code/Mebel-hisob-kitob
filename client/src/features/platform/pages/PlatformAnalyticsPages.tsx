import { formatMoney } from '@furniture-erp/shared';
import { useState } from 'react';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { SegmentedNav } from '@/components/ui/SegmentedNav';
import { ROUTES } from '@/routes/paths';

import { PlatformBarChart } from '../components/PlatformBarChart';
import { usePlatformAnalytics } from '../hooks/use-platform-billing';

const PRESETS = [
  { id: 'THIS_MONTH', label: 'Shu oy' },
  { id: 'LAST_MONTH', label: "O'tgan oy" },
  { id: 'THIS_YEAR', label: 'Shu yil' },
];

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
  const [preset, setPreset] = useState('THIS_YEAR');
  const analytics = usePlatformAnalytics(preset);
  const stores = analytics.data?.stores;
  const finance = analytics.data?.finance;

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">Analytics</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Yangi do&apos;konlar, to&apos;langan obuna daromadi, platforma xarajati va sof foyda.
        </p>
      </div>
      <SegmentedNav
        ariaLabel="Analytics bo'limlari"
        items={[
          { to: ROUTES.platformAnalytics, label: 'Barchasi', end: true },
          { to: ROUTES.platformAnalyticsStores, label: "Yangi do'konlar" },
          { to: ROUTES.platformAnalyticsRevenue, label: 'Daromad' },
          { to: ROUTES.platformAnalyticsExpenses, label: 'Xarajat' },
          { to: ROUTES.platformAnalyticsProfit, label: 'Sof foyda' },
        ]}
      />
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPreset(item.id)}
            className={`rounded-input px-3 py-1.5 text-sm ${
              preset === item.id ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-surface-hover'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {analytics.isPending && !analytics.data ? (
        <Skeleton className="h-40 w-full" />
      ) : analytics.isError ? (
        <ErrorState
          title="Analytics yuklanmadi"
          message="Qayta urinib ko'ring."
          onRetry={() => void analytics.refetch()}
        />
      ) : (
        <>
          {focus === 'all' || focus === 'stores' ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Kpi label="Submitted" value={String(stores?.submitted ?? 0)} />
                <Kpi label="Approved" value={String(stores?.approved ?? 0)} />
                <Kpi label="Rejected" value={String(stores?.rejected ?? 0)} />
                <Kpi label="Faol" value={String(stores?.active ?? 0)} />
                <Kpi label="Bloklangan" value={String(stores?.blocked ?? 0)} />
              </div>
              <PlatformBarChart
                title="Yangi do'konlar"
                emptyLabel="Ariza yo'q."
                series={stores?.series ?? []}
                keys={[
                  { key: 'submitted', label: 'Ariza', className: 'bg-info-500' },
                  { key: 'approved', label: 'Tasdiq', className: 'bg-success-500' },
                  { key: 'rejected', label: 'Rad', className: 'bg-danger-400' },
                ]}
              />
            </>
          ) : null}
          {focus === 'all' || focus === 'revenue' || focus === 'expenses' || focus === 'profit' ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Kpi label="Daromad" value={formatMoney(finance?.revenue ?? 0)} />
                <Kpi label="Xarajat" value={formatMoney(finance?.expenses ?? 0)} />
                <Kpi label="Sof foyda" value={formatMoney(finance?.netProfit ?? 0)} />
              </div>
              <PlatformBarChart
                title="Moliyaviy natija"
                emptyLabel="Ma'lumot yo'q."
                series={finance?.series ?? []}
                keys={[
                  { key: 'revenue', label: 'Daromad', className: 'bg-success-500' },
                  { key: 'expenses', label: 'Xarajat', className: 'bg-danger-400' },
                  { key: 'netProfit', label: 'Sof foyda', className: 'bg-brand-500' },
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
