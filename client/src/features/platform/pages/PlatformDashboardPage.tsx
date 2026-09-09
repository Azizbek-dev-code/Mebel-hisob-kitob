import { formatMoney } from '@furniture-erp/shared';
import { Ban, CreditCard, Inbox, Store } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PageContainer } from '@/components/layout/PageContainer';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { ROUTES } from '@/routes/paths';
import { formatDate } from '@/utils/format';

import { PlatformBarChart } from '../components/PlatformBarChart';
import { usePlatformDashboard } from '../hooks/use-platform-billing';

const MODULES: { to: string; title: string; description: string }[] = [
  {
    to: ROUTES.platformStoreRequests,
    title: "Do'kon so'rovlari",
    description: "Yangi do'kon ochish arizalarini ko'rib chiqish.",
  },
  {
    to: ROUTES.platformShops,
    title: "Do'konlar",
    description: "Faol, to'lov kutilayotgan va bloklangan do'konlar.",
  },
  {
    to: ROUTES.platformSubscriptionRequests,
    title: "Tarif so'rovlari",
    description: "Do'kon tarif o'zgartirish so'rovlarini qabul qilish yoki rad etish.",
  },
  {
    to: ROUTES.platformPayments,
    title: "To'lovlar",
    description: "To'lov tarixi, kutilayotganlar va muddati o'tganlar.",
  },
  { to: ROUTES.platformPlans, title: 'Tariflar', description: 'Platforma tariflarini boshqarish.' },
  {
    to: ROUTES.platformExpenses,
    title: 'Platforma xarajatlari',
    description: 'Platforma darajasidagi xarajatlar.',
  },
  {
    to: ROUTES.platformPnl,
    title: 'Daromad / P&L',
    description: 'Platforma moliyaviy natijasi.',
  },
  {
    to: ROUTES.platformAnalytics,
    title: 'Analytics',
    description: "Yangi do'konlar, daromad, xarajat va sof foyda.",
  },
  {
    to: ROUTES.platformSettings,
    title: 'Platform Settings',
    description: 'Platforma sozlamalari.',
  },
];

export function PlatformDashboardPage() {
  const dashboard = usePlatformDashboard(true);
  const data = dashboard.data;

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">Dashboard</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Platforma boshqaruvi. Do&apos;kon ichidagi savdo va ombor bu yerda ko&apos;rinmaydi.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Link to={ROUTES.platformShops} className="min-w-0">
          <KpiCard
            title="Jami do'konlar"
            context="Do'konlar"
            value={String(data?.totalStores ?? 0)}
            icon={Store}
            isLoading={dashboard.isPending && !data}
          />
        </Link>
        <Link to={ROUTES.platformShopsActive} className="min-w-0">
          <KpiCard
            title="Faol do'konlar"
            context="Do'konlar"
            value={String(data?.activeStores ?? 0)}
            icon={Store}
            tone="success"
            isLoading={dashboard.isPending && !data}
          />
        </Link>
        <Link to={ROUTES.platformShopsActive} className="min-w-0">
          <KpiCard
            title="Trial'dagi do'konlar"
            context="Obuna"
            value={String(data?.trialStores ?? 0)}
            icon={Store}
            tone="info"
            isLoading={dashboard.isPending && !data}
          />
        </Link>
        <Link to={ROUTES.platformShopsActive} className="min-w-0">
          <KpiCard
            title="Faol obunalar"
            context="Obuna"
            value={String(data?.activeSubscriptions ?? 0)}
            icon={Store}
            tone="success"
            isLoading={dashboard.isPending && !data}
          />
        </Link>
        <Link to={ROUTES.platformShopsPendingPayment} className="min-w-0">
          <KpiCard
            title="To'lov kutilmoqda"
            context="Obuna"
            value={String(data?.pendingPaymentStores ?? 0)}
            icon={CreditCard}
            tone="warning"
            isLoading={dashboard.isPending && !data}
          />
        </Link>
        <Link to={ROUTES.platformPaymentsOverdue} className="min-w-0">
          <KpiCard
            title="Muddati o'tgan"
            context="Obuna"
            value={String(data?.expiredStores ?? 0)}
            icon={Ban}
            tone="danger"
            isLoading={dashboard.isPending && !data}
          />
        </Link>
        <Link to={ROUTES.platformShopsBlocked} className="min-w-0">
          <KpiCard
            title="Bloklangan do'konlar"
            context="Do'konlar"
            value={String(data?.blockedStores ?? 0)}
            icon={Ban}
            tone="danger"
            isLoading={dashboard.isPending && !data}
          />
        </Link>
        <Link to={ROUTES.platformSubscriptionRequests} className="min-w-0">
          <KpiCard
            title="Kutilayotgan tarif so'rovlari"
            context="Tarif so'rovlari"
            value={String(data?.pendingSubscriptionRequests ?? 0)}
            icon={Inbox}
            tone="warning"
            isLoading={dashboard.isPending && !data}
            footnote="Tarif so'rovlarini ochish"
          />
        </Link>
        <Link to={ROUTES.platformStoreRequests} className="min-w-0">
          <KpiCard
            title="Kutilayotgan do'kon so'rovlari"
            context="Do'kon so'rovlari"
            value={String(data?.pendingStoreRequests ?? 0)}
            icon={Inbox}
            tone="warning"
            isLoading={dashboard.isPending && !data}
            footnote="Do'kon so'rovlarini ochish"
          />
        </Link>
        <Link to={ROUTES.platformPaymentsPending} className="min-w-0">
          <KpiCard
            title="Kutilayotgan to'lovlar"
            context="To'lovlar"
            value={String(data?.pendingPayments ?? 0)}
            icon={CreditCard}
            tone="info"
            isLoading={dashboard.isPending && !data}
            footnote={data ? formatMoney(data.pendingPaymentAmount) : undefined}
          />
        </Link>
        <Link to={ROUTES.platformPaymentsOverdue} className="min-w-0">
          <KpiCard
            title="Muddati o'tgan to'lovlar"
            context="To'lovlar"
            value={String(data?.overduePayments ?? 0)}
            icon={CreditCard}
            tone="danger"
            isLoading={dashboard.isPending && !data}
            footnote={data ? formatMoney(data.overduePaymentAmount) : undefined}
          />
        </Link>
        <Link to={ROUTES.platformPayments} className="min-w-0">
          <KpiCard
            title="Jami obuna tushumi"
            context="To'lovlar"
            value={data ? formatMoney(data.subscriptionRevenueTotal ?? 0) : '0'}
            icon={CreditCard}
            tone="success"
            isLoading={dashboard.isPending && !data}
          />
        </Link>
        <KpiCard
          title="Shu oy obuna tushumi"
          context="To'lovlar"
          value={data ? formatMoney(data.subscriptionRevenueThisMonth ?? data.monthRevenue) : '0'}
          icon={CreditCard}
          tone="success"
          isLoading={dashboard.isPending && !data}
        />
        <KpiCard
          title="Shu oy daromad"
          context="P&L"
          value={data ? formatMoney(data.monthRevenue) : '0'}
          icon={CreditCard}
          tone="success"
          isLoading={dashboard.isPending && !data}
        />
        <KpiCard
          title="Shu oy xarajat"
          context="P&L"
          value={data ? formatMoney(data.monthExpenses) : '0'}
          icon={CreditCard}
          tone="warning"
          isLoading={dashboard.isPending && !data}
        />
        <KpiCard
          title="Shu oy sof foyda"
          context="P&L"
          value={data ? formatMoney(data.monthNetProfit) : '0'}
          icon={CreditCard}
          tone="brand"
          isLoading={dashboard.isPending && !data}
        />
      </div>

      <PlatformBarChart
        title="Daromad vs xarajat"
        emptyLabel="Hali moliyaviy yozuv yo'q."
        series={data?.pnlSeries ?? []}
        keys={[
          { key: 'revenue', label: 'Daromad', className: 'bg-success-500' },
          { key: 'expenses', label: 'Xarajat', className: 'bg-danger-400' },
          { key: 'netProfit', label: 'Sof foyda', className: 'bg-brand-500' },
        ]}
      />
      <PlatformBarChart
        title="Yangi do'konlar"
        emptyLabel="Bu oyda ariza yo'q."
        series={data?.storeSeries ?? []}
        keys={[
          { key: 'submitted', label: 'Ariza', className: 'bg-info-500' },
          { key: 'approved', label: 'Tasdiq', className: 'bg-success-500' },
        ]}
      />

      <section className="rounded-panel border border-line bg-surface shadow-card">
        <header className="border-b border-line px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold text-ink">Muddati o&apos;tgan to&apos;lovlar</h3>
        </header>
        <p className="px-4 py-3 text-sm text-ink-muted sm:px-5">
          {data?.overduePayments
            ? `${data.overduePayments} ta · ${formatMoney(data.overduePaymentAmount)}`
            : "Muddati o'tgan to'lov yo'q."}
        </p>
      </section>

      <section className="rounded-panel border border-line bg-surface shadow-card">
        <header className="border-b border-line px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold text-ink">So&apos;nggi to&apos;lovlar</h3>
        </header>
        <ul className="divide-y divide-line">
          {(data?.latestPayments ?? []).length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-muted sm:px-5">Hali to&apos;lov yo&apos;q.</li>
          ) : (
            data?.latestPayments.map((row) => (
              <li key={row.id} className="flex justify-between gap-3 px-4 py-3 text-sm sm:px-5">
                <span className="min-w-0 truncate">{row.storeName}</span>
                <span className="shrink-0">{formatMoney(row.amount)}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-panel border border-line bg-surface shadow-card">
        <header className="border-b border-line px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold text-ink">So&apos;nggi do&apos;kon so&apos;rovlari</h3>
        </header>
        <ul className="divide-y divide-line">
          {(data?.latestStoreRequests ?? []).length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-muted sm:px-5">Ariza yo&apos;q.</li>
          ) : (
            data?.latestStoreRequests.map((row) => (
              <li key={row.id} className="flex justify-between gap-3 px-4 py-3 text-sm sm:px-5">
                <Link to={ROUTES.platformStoreRequestDetail(row.id)} className="min-w-0 truncate hover:underline">
                  {row.storeName}
                </Link>
                <span className="shrink-0 text-ink-muted">{formatDate(row.createdAt)}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-panel border border-line bg-surface shadow-card">
        <header className="border-b border-line px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold text-ink">Modullar</h3>
          <p className="mt-0.5 text-xs text-ink-muted">Platform Admin bo&apos;limlari</p>
        </header>
        <ul className="divide-y divide-line">
          {MODULES.map((module) => (
            <li key={module.to}>
              <Link
                to={module.to}
                className="flex flex-col gap-0.5 px-4 py-3 hover:bg-surface-hover sm:px-5"
              >
                <span className="text-sm font-medium text-ink">{module.title}</span>
                <span className="text-xs text-ink-muted">{module.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageContainer>
  );
}
