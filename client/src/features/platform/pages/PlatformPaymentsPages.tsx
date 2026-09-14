import {
  PLATFORM_BILLING_STATUS_LABELS,
  PLATFORM_PAYMENT_METHOD_LABELS,
  SUBSCRIPTION_REQUEST_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  PlatformBillingStatus,
  SubscriptionRequestStatus,
  formatMoney,
  type PlatformInvoiceDto,
  type SubscriptionRequestDto,
} from '@furniture-erp/shared';
import { AlertTriangle, Clock, History, Inbox, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { SegmentedNav } from '@/components/ui/SegmentedNav';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/routes/paths';
import { formatDate } from '@/utils/format';

import { ApproveSubscriptionRequestDialog } from '../components/ApproveSubscriptionRequestDialog';
import { RecordPaymentDialog } from '../components/RecordPaymentDialog';
import { RejectPaymentDialog } from '../components/RejectPaymentDialog';
import { RejectSubscriptionRequestDialog } from '../components/RejectSubscriptionRequestDialog';
import {
  usePlatformInvoices,
  usePlatformPlans,
  usePlatformSubscriptionRequests,
} from '../hooks/use-platform-billing';
import { usePlatformShops } from '../hooks/use-platform-shops';

type PaymentsTab = 'history' | 'pending' | 'overdue';

function statusTone(status: string) {
  if (status === PlatformBillingStatus.PAID) return 'success' as const;
  if (status === PlatformBillingStatus.OVERDUE) return 'danger' as const;
  if (status === PlatformBillingStatus.PENDING) return 'warning' as const;
  return 'neutral' as const;
}

export function PlatformPaymentsHistoryPage() {
  return <PlatformPaymentsPage tab="history" />;
}

export function PlatformPaymentsPendingPage() {
  return <PlatformPaymentsPage tab="pending" />;
}

export function PlatformPaymentsOverduePage() {
  return <PlatformPaymentsPage tab="overdue" />;
}

function PlatformPaymentsPage({ tab }: { tab: PaymentsTab }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [storeId, setStoreId] = useState('');
  const [planId, setPlanId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paying, setPaying] = useState<PlatformInvoiceDto | null>(null);
  const [rejecting, setRejecting] = useState<PlatformInvoiceDto | null>(null);
  const [viewing, setViewing] = useState<PlatformInvoiceDto | null>(null);
  const [approvingRequest, setApprovingRequest] = useState<SubscriptionRequestDto | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<SubscriptionRequestDto | null>(null);
  const [viewingRequest, setViewingRequest] = useState<SubscriptionRequestDto | null>(null);

  const status =
    tab === 'pending'
      ? PlatformBillingStatus.PENDING
      : tab === 'overdue'
        ? PlatformBillingStatus.OVERDUE
        : statusFilter || undefined;

  const query = useMemo(
    () => ({
      status: status as PlatformInvoiceDto['status'] | undefined,
      search: search.trim() || undefined,
      month: month || undefined,
      storeId: storeId || undefined,
      planId: planId || undefined,
      pageSize: 50,
    }),
    [status, search, month, storeId, planId],
  );

  const invoices = usePlatformInvoices(query);
  const shops = usePlatformShops();
  const plans = usePlatformPlans();
  const requests = usePlatformSubscriptionRequests(
    SubscriptionRequestStatus.PENDING,
    tab === 'pending',
  );

  const emptyIcon = tab === 'overdue' ? AlertTriangle : tab === 'pending' ? Clock : History;

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">To&apos;lovlar</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Platforma obuna to&apos;lovlari. Do&apos;kon ichidagi savdo to&apos;lovlari bu yerda emas.
        </p>
      </div>

      <SegmentedNav
        ariaLabel="To'lov bo'limlari"
        items={[
          { to: ROUTES.platformPayments, label: 'Tarix', end: true },
          { to: ROUTES.platformPaymentsPending, label: 'Kutilayotgan' },
          { to: ROUTES.platformPaymentsOverdue, label: "Muddati o'tgan" },
        ]}
      />

      {tab !== 'history' && invoices.data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-panel border border-line bg-surface p-4 shadow-card">
            <p className="text-xs text-ink-muted">
              {tab === 'pending' ? "Kutilayotgan do'konlar" : "Muddati o'tgan do'konlar"}
            </p>
            <p className="mt-1 text-lg font-semibold text-ink">{invoices.data.storeCount}</p>
          </div>
          <div className="rounded-panel border border-line bg-surface p-4 shadow-card">
            <p className="text-xs text-ink-muted">Jami summa</p>
            <p className="mt-1 text-lg font-semibold text-ink">{formatMoney(invoices.data.totalAmount)}</p>
          </div>
        </div>
      ) : null}

      {tab === 'pending' ? (
        <SectionCard title="Obuna so'rovlari">
          <p className="mb-3 text-xs text-ink-muted">
            To&apos;liq ro&apos;yxat:{' '}
            <Link to={ROUTES.platformSubscriptionRequests} className="font-medium text-brand-700 hover:underline">
              Tarif so&apos;rovlari
            </Link>
          </p>
          {requests.isPending && !requests.data ? (
            <Skeleton className="h-24 w-full" />
          ) : requests.isError ? (
            <ErrorState
              title="So'rovlarni yuklab bo'lmadi"
              message="Qayta urinib ko'ring."
              onRetry={() => void requests.refetch()}
              isRetrying={requests.isFetching}
            />
          ) : (requests.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={Clock}
              title="Kutilayotgan so'rov yo'q"
              description="Do'konlar tarif tanlab Obuna bo'lish bosganda so'rov shu yerda chiqadi."
            />
          ) : (
            <ul className="divide-y divide-line">
              {requests.data?.items.map((row) => (
                <li key={row.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{row.storeName}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Hozirgi: {row.currentPlanName ?? '—'}
                      {row.currentStatus
                        ? ` (${SUBSCRIPTION_STATUS_LABELS[row.currentStatus]})`
                        : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Tanlangan: {row.planName} · {formatMoney(row.requestedPriceSnapshot)} / oy
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {[row.ownerName, row.ownerPhone, formatDate(row.requestedAt)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-1">
                    <Badge tone="warning">{SUBSCRIPTION_REQUEST_STATUS_LABELS[row.status]}</Badge>
                    <button
                      type="button"
                      className="text-xs font-medium text-brand-700 hover:underline"
                      onClick={() => setViewingRequest(row)}
                    >
                      Ko&apos;rish
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-brand-700 hover:underline"
                      onClick={() => setApprovingRequest(row)}
                    >
                      Qabul qilish
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-danger-700 hover:underline"
                      onClick={() => setRejectingRequest(row)}
                    >
                      Rad etish
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      <SectionCard title={tab === 'pending' ? "Kutilayotgan invoyslar" : "Ro'yxat"}>
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-ink-subtle" />
            <input
              className="w-full rounded-input border border-line py-2 pr-3 pl-8 text-sm"
              placeholder="Do'kon, egasi, telefon"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {tab === 'history' ? (
            <select
              className="w-full rounded-input border border-line px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Barcha statuslar</option>
              <option value={PlatformBillingStatus.PAID}>To'langan</option>
              <option value={PlatformBillingStatus.PENDING}>Kutilmoqda</option>
              <option value={PlatformBillingStatus.OVERDUE}>Muddati o'tgan</option>
            </select>
          ) : null}
          <input
            type="month"
            className="w-full rounded-input border border-line px-3 py-2 text-sm"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
          <select
            className="w-full rounded-input border border-line px-3 py-2 text-sm"
            value={storeId}
            onChange={(event) => setStoreId(event.target.value)}
          >
            <option value="">Barcha do'konlar</option>
            {shops.data?.items.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-input border border-line px-3 py-2 text-sm"
            value={planId}
            onChange={(event) => setPlanId(event.target.value)}
          >
            <option value="">Barcha tariflar</option>
            {plans.data?.items.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </div>

        {invoices.isPending && !invoices.data ? (
          <Skeleton className="h-24 w-full" />
        ) : invoices.isError ? (
          <ErrorState
            title="To'lovlarni yuklab bo'lmadi"
            message="Qayta urinib ko'ring."
            onRetry={() => void invoices.refetch()}
            isRetrying={invoices.isFetching}
          />
        ) : (invoices.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title="Yozuv yo'q"
            description="Tanlangan filter bo'yicha to'lov topilmadi."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs text-ink-muted">
                <tr>
                  <th className="py-2 pr-3 font-medium">Do'kon</th>
                  <th className="py-2 pr-3 font-medium">Tarif</th>
                  <th className="py-2 pr-3 font-medium">Summa</th>
                  <th className="py-2 pr-3 font-medium">To'lov sanasi</th>
                  <th className="py-2 pr-3 font-medium">Davr</th>
                  {tab === 'overdue' ? <th className="py-2 pr-3 font-medium">Kechikish</th> : null}
                  <th className="py-2 pr-3 font-medium">Usul</th>
                  <th className="py-2 pr-3 font-medium">Admin</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoices.data?.items.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-3">
                      <p className="font-medium text-ink">{row.storeName}</p>
                      <p className="text-xs text-ink-muted">
                        {[row.ownerName, row.ownerPhone].filter(Boolean).join(' · ')}
                      </p>
                    </td>
                    <td className="py-2 pr-3">{row.planName}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatMoney(row.amount)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {row.paidAt ? formatDate(row.paidAt) : '—'}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {formatDate(row.billingPeriodStart)} → {formatDate(row.billingPeriodEnd)}
                    </td>
                    {tab === 'overdue' ? (
                      <td className="py-2 pr-3 whitespace-nowrap">{row.daysOverdue} kun</td>
                    ) : null}
                    <td className="py-2 pr-3">
                      {row.paymentMethod ? PLATFORM_PAYMENT_METHOD_LABELS[row.paymentMethod] : '—'}
                    </td>
                    <td className="py-2 pr-3">{row.recordedByName ?? '—'}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={statusTone(row.status)}>
                        {PLATFORM_BILLING_STATUS_LABELS[row.status]}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-col gap-1">
                        {row.status !== PlatformBillingStatus.PAID &&
                        row.status !== PlatformBillingStatus.CANCELLED &&
                        row.status !== PlatformBillingStatus.REJECTED ? (
                          <>
                            <button
                              type="button"
                              className="text-left text-xs font-medium text-brand-700 hover:underline"
                              onClick={() => setViewing(row)}
                            >
                              Ko'rish
                            </button>
                            <button
                              type="button"
                              className="text-left text-xs font-medium text-brand-700 hover:underline"
                              onClick={() => setPaying(row)}
                            >
                              To'lovni qayd etish
                            </button>
                            <button
                              type="button"
                              className="text-left text-xs font-medium text-danger-700 hover:underline"
                              onClick={() => setRejecting(row)}
                            >
                              Rad etish
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {tab === 'history' ? (
        <SectionCard title={t('platformAdmin.subscriptions.personalTitle')}>
          <EmptyState
            icon={Inbox}
            title={t('platformAdmin.subscriptions.personalPaymentsEmpty')}
            description={t('platformAdmin.subscriptions.personalPaymentsHint')}
          />
        </SectionCard>
      ) : null}

      <RecordPaymentDialog invoice={paying} onClose={() => setPaying(null)} />
      <RejectPaymentDialog invoice={rejecting} onClose={() => setRejecting(null)} />
      {viewing ? (
        <RecordPaymentDialog
          invoice={viewing}
          onClose={() => setViewing(null)}
        />
      ) : null}
      <ApproveSubscriptionRequestDialog
        request={approvingRequest ?? viewingRequest}
        onClose={() => {
          setApprovingRequest(null);
          setViewingRequest(null);
        }}
      />
      <RejectSubscriptionRequestDialog
        request={rejectingRequest}
        onClose={() => setRejectingRequest(null)}
      />
    </PageContainer>
  );
}
