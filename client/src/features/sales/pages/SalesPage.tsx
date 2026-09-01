import {
  AssemblyTaskStatus,
  FulfilmentStatus,
  SalePaymentStatus,
  SaleStatus,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import { Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { canCancelSale } from '@/routes/navigation';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatMoney } from '@/utils/format';
import {
  assemblyStatusLabel,
  assemblyStatusTone,
  customerDisplayName,
  deliveryStatusLabel,
  deliveryStatusTone,
  formatSaleNumber,
  paymentStatusLabel,
  paymentStatusTone,
  saleStatusLabel,
  saleStatusTone,
} from '@/utils/sales';

import { useDeleteCancelledSale, useSalesList, useWorkerLookup } from '../hooks/use-sales';

const selectClass =
  'rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

type StatusFilter = 'OPEN' | 'CANCELLED' | 'ALL';

export function SalesPage() {
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const canDeleteCancelled = canCancelSale(currentUser);
  const deleteCancelledSale = useDeleteCancelledSale();
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<SalePaymentStatus | ''>('');
  const [sellerId, setSellerId] = useState('');
  const [assemblyStatus, setAssemblyStatus] = useState<AssemblyTaskStatus | ''>('');
  const [deliveryStatus, setDeliveryStatus] = useState<FulfilmentStatus | ''>('');
  /** Include cancelled by default — after cancel, sales must still be findable in the list. */
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const workers = useWorkerLookup('', WorkerResponsibility.SELLER);

  const filters = useMemo(
    () => ({
      page,
      pageSize: 20,
      search: search.trim() || undefined,
      paymentStatus: paymentStatus || undefined,
      sellerId: sellerId || undefined,
      assemblyStatus: assemblyStatus || undefined,
      deliveryStatus: deliveryStatus || undefined,
      status: statusFilter,
      from: from || undefined,
      to: to || undefined,
    }),
    [page, search, paymentStatus, sellerId, assemblyStatus, deliveryStatus, statusFilter, from, to],
  );

  const sales = useSalesList(filters);

  async function handleDeletePermanent(saleId: string, saleNumber: number) {
    if (!window.confirm(t('sales.deleteConfirm', { number: formatSaleNumber(saleNumber) }))) {
      return;
    }
    try {
      await deleteCancelledSale.mutateAsync(saleId);
      setActionMessage(t('sales.deletedMessage'));
    } catch (error) {
      setActionMessage(mutationErrorMessage(error, t('sales.deleteFailed')));
    }
  }

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('sales.title')}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t('sales.subtitle')}</p>
        </div>
        <WriteGuard
          to={ROUTES.saleNew}
          feature="sales"
          className="inline-flex items-center justify-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700"
        >
          <Plus className="size-4" />
          {t('sales.new')}
        </WriteGuard>
      </div>

      {actionMessage ? (
        <p role="status" className="rounded-input border border-line bg-surface-muted px-3 py-2 text-sm text-ink">
          {actionMessage}
        </p>
      ) : null}

      <SectionCard title={t('sales.filters')} description={t('sales.filtersHint')}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative md:col-span-2 xl:col-span-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={t('sales.searchPlaceholder')}
              className={`${selectClass} w-full py-2.5 pr-3 pl-9`}
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setPage(1);
            }}
            className={selectClass}
            aria-label={t('common.status')}
            data-testid="sales-status-filter"
          >
            <option value="ALL">{t('common.all')}</option>
            <option value="OPEN">{t('sales.statusOpen')}</option>
            <option value="CANCELLED">{t('status.sale.CANCELLED')}</option>
          </select>

          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className={selectClass}
            aria-label={t('common.date')}
          />
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className={selectClass}
            aria-label={t('common.date')}
          />

          <select
            value={paymentStatus}
            onChange={(event) => {
              setPaymentStatus(event.target.value as SalePaymentStatus | '');
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">{t('sales.payment')}</option>
            {Object.values(SalePaymentStatus).map((status) => (
              <option key={status} value={status}>
                {paymentStatusLabel(status)}
              </option>
            ))}
          </select>

          <select
            value={sellerId}
            onChange={(event) => {
              setSellerId(event.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">{t('sales.seller')}</option>
            {(workers.data ?? []).map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.fullName}
              </option>
            ))}
          </select>

          <select
            value={assemblyStatus}
            onChange={(event) => {
              setAssemblyStatus(event.target.value as AssemblyTaskStatus | '');
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">{t('nav.assembly')}</option>
            {Object.values(AssemblyTaskStatus).map((status) => (
              <option key={status} value={status}>
                {assemblyStatusLabel(status)}
              </option>
            ))}
          </select>

          <select
            value={deliveryStatus}
            onChange={(event) => {
              setDeliveryStatus(event.target.value as FulfilmentStatus | '');
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">{t('sales.delivery')}</option>
            {Object.values(FulfilmentStatus).map((status) => (
              <option key={status} value={status}>
                {deliveryStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </SectionCard>

      {sales.isError ? (
        <ErrorState
          title={t('common.error')}
          message={sales.error instanceof Error ? sales.error.message : t('common.error')}
          onRetry={() => void sales.refetch()}
        />
      ) : null}

      {sales.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : null}

      {sales.data && sales.data.items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={t('common.notFound')}
          description={t('sales.subtitle')}
          action={
            <WriteGuard
              to={ROUTES.saleNew}
              feature="sales"
              className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white"
            >
              <Plus className="size-4" />
              {t('sales.new')}
            </WriteGuard>
          }
        />
      ) : null}

      {sales.data && sales.data.items.length > 0 ? (
        <SectionCard title={t('sales.title')} padded={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-muted text-xs tracking-wide text-ink-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('sales.totalSale')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.status')}</th>
                  <th className="px-4 py-3 font-medium">{t('sales.customer')}</th>
                  <th className="px-4 py-3 font-medium">{t('sales.furniture')}</th>
                  <th className="px-4 py-3 font-medium">{t('sales.seller')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('sales.totalSale')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('sales.paid')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('sales.remaining')}</th>
                  <th className="px-4 py-3 font-medium">{t('sales.payment')}</th>
                  <th className="px-4 py-3 font-medium">{t('nav.assembly')}</th>
                  <th className="px-4 py-3 font-medium">{t('sales.delivery')}</th>
                  {canDeleteCancelled ? (
                    <th className="px-4 py-3 font-medium">{t('common.actions')}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {sales.data.items.map((sale) => (
                  <tr
                    key={sale.id}
                    className={`border-b border-line last:border-0 hover:bg-surface-muted ${
                      sale.status === SaleStatus.CANCELLED ? 'bg-danger-50/40' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={ROUTES.saleDetail(sale.id)}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {formatSaleNumber(sale.saleNumber)}
                      </Link>
                      <p className="text-xs text-ink-muted">
                        {t('sales.orderLabel')}: {formatDate(sale.saleDate)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={saleStatusTone(sale.status)}>{saleStatusLabel(sale.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{customerDisplayName(sale.customer)}</p>
                      <p className="text-xs text-ink-muted">{sale.customer.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{sale.productSummary}</td>
                    <td className="px-4 py-3 text-ink-soft">{sale.seller?.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-ink">
                      {formatMoney(sale.totalSalePrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-soft">
                      {formatMoney(sale.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-soft">
                      {formatMoney(sale.remainingAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={paymentStatusTone(sale.paymentStatus)}>
                        {paymentStatusLabel(sale.paymentStatus)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={assemblyStatusTone(sale.assemblyStatus)}>
                        {assemblyStatusLabel(sale.assemblyStatus)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={deliveryStatusTone(sale.deliveryStatus)}>
                        {deliveryStatusLabel(sale.deliveryStatus)}
                      </Badge>
                      {sale.deliveryDueDate ? (
                        <p className="mt-1 text-xs text-ink-muted">
                          {t('sales.deliveryDueShort')}: {formatDate(sale.deliveryDueDate)}
                        </p>
                      ) : null}
                    </td>
                    {canDeleteCancelled ? (
                      <td className="px-4 py-3">
                        {sale.status === SaleStatus.CANCELLED ? (
                          <button
                            type="button"
                            onClick={() => void handleDeletePermanent(sale.id, sale.saleNumber)}
                            disabled={deleteCancelledSale.isPending}
                            className="inline-flex items-center gap-1 rounded-input border border-danger-200 px-2 py-1 text-xs text-danger-700 hover:bg-danger-50 disabled:opacity-60"
                            data-testid={`sale-delete-${sale.id}`}
                          >
                            <Trash2 className="size-3.5" />
                            {t('common.delete')}
                          </button>
                        ) : (
                          <span className="text-xs text-ink-subtle">—</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sales.data.meta.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
              <p className="text-ink-muted">
                {sales.data.meta.page} / {sales.data.meta.totalPages} ·{' '}
                {sales.data.meta.totalItems} {t('sales.title').toLowerCase()}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!sales.data.meta.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-input border border-line px-3 py-1.5 disabled:opacity-40"
                >
                  {t('common.back')}
                </button>
                <button
                  type="button"
                  disabled={!sales.data.meta.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-input border border-line px-3 py-1.5 disabled:opacity-40"
                >
                  {t('common.continue')}
                </button>
              </div>
            </div>
          ) : null}
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
