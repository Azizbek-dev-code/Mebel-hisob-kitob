import {
  AssemblyTaskStatus,
  FulfilmentStatus,
  SalePaymentStatus,
  SaleStatus,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import { Plus, Search, ShoppingCart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { WriteGuard } from '@/features/subscription/WriteGuard';
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

import { useSalesList, useWorkerLookup } from '../hooks/use-sales';

const selectClass =
  'rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

type StatusFilter = 'OPEN' | 'CANCELLED' | 'ALL';

export function SalesPage() {
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<SalePaymentStatus | ''>('');
  const [sellerId, setSellerId] = useState('');
  const [assemblyStatus, setAssemblyStatus] = useState<AssemblyTaskStatus | ''>('');
  const [deliveryStatus, setDeliveryStatus] = useState<FulfilmentStatus | ''>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('OPEN');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

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

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Sotuvlar</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Record sales, deposits, installments and assembly assignments.
          </p>
        </div>
        <WriteGuard
          to={ROUTES.saleNew}
          feature="sales"
          className="inline-flex items-center justify-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700"
        >
          <Plus className="size-4" />
          New sale
        </WriteGuard>
      </div>

      <SectionCard title="Filters" description="Search and narrow the sales list">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative md:col-span-2 xl:col-span-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search customer, phone, product, #…"
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
            aria-label="Sale status"
            data-testid="sales-status-filter"
          >
            <option value="OPEN">Active / completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="ALL">All</option>
          </select>

          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className={selectClass}
            aria-label="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className={selectClass}
            aria-label="To date"
          />

          <select
            value={paymentStatus}
            onChange={(event) => {
              setPaymentStatus(event.target.value as SalePaymentStatus | '');
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">Payment status</option>
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
            <option value="">Seller</option>
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
            <option value="">Assembly</option>
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
            <option value="">Delivery</option>
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
          title="Could not load sales"
          message={sales.error instanceof Error ? sales.error.message : 'Try again.'}
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
          title="No sales yet"
          description="Record the first sale — customer, furniture, deposit and assembly worker."
          action={
            <WriteGuard
              to={ROUTES.saleNew}
              feature="sales"
              className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white"
            >
              <Plus className="size-4" />
              New sale
            </WriteGuard>
          }
        />
      ) : null}

      {sales.data && sales.data.items.length > 0 ? (
        <SectionCard title="Sales" padded={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-muted text-xs tracking-wide text-ink-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Sale</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Furniture</th>
                  <th className="px-4 py-3 font-medium">Seller</th>
                  <th className="px-4 py-3 font-medium text-right">Sale</th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Remaining</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Assembly</th>
                  <th className="px-4 py-3 font-medium">Delivery</th>
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
                      <p className="text-xs text-ink-muted">{formatDate(sale.saleDate)}</p>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sales.data.meta.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
              <p className="text-ink-muted">
                Page {sales.data.meta.page} of {sales.data.meta.totalPages} ·{' '}
                {sales.data.meta.totalItems} sales
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!sales.data.meta.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-input border border-line px-3 py-1.5 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!sales.data.meta.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-input border border-line px-3 py-1.5 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
