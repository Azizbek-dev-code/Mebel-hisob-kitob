import { ShoppingCart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useMySales } from '@/features/workers/hooks/use-workers';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatMoney } from '@/utils/format';
import { formatSaleNumber, paymentStatusLabel, paymentStatusTone } from '@/utils/sales';
import { Badge } from '@/components/ui/Badge';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export function MySalesPage() {
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({
      page,
      pageSize: 20,
      search: search.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [page, search, from, to],
  );

  const sales = useMySales(params);

  return (
    <PageContainer className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Mening sotuvlarim</h2>
        <p className="mt-1 text-sm text-ink-muted">Sales where you are the seller.</p>
      </div>

      <SectionCard title="Filters">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className={fieldClass}
            placeholder="Search customer or sale number"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <input
            type="date"
            className={fieldClass}
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
          />
          <input
            type="date"
            className={fieldClass}
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </SectionCard>

      {sales.isError ? (
        <ErrorState
          title="Could not load sales"
          message={sales.error instanceof Error ? sales.error.message : 'Try again.'}
          onRetry={() => void sales.refetch()}
        />
      ) : null}

      {sales.isLoading ? <Skeleton className="h-40 w-full" /> : null}

      {sales.data && sales.data.items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No sales yet"
          description="When you are selected as seller on a sale, it will appear here."
        />
      ) : null}

      {sales.data && sales.data.items.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-panel border border-line bg-surface shadow-card">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Sale</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Paid</th>
                  <th className="px-4 py-3 font-medium">Remaining</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.data.items.map((sale) => (
                  <tr key={sale.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <Link to={ROUTES.saleDetail(sale.id)} className="font-medium text-brand-700 hover:underline">
                        {formatSaleNumber(sale.saleNumber)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatDate(sale.saleDate)}</td>
                    <td className="px-4 py-3">{sale.customerName}</td>
                    <td className="px-4 py-3">{sale.productSummary}</td>
                    <td className="px-4 py-3">{formatMoney(sale.totalSalePrice)}</td>
                    <td className="px-4 py-3">{formatMoney(sale.paidAmount)}</td>
                    <td className="px-4 py-3">{formatMoney(sale.remainingAmount)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={paymentStatusTone(sale.paymentStatus)}>
                        {paymentStatusLabel(sale.paymentStatus)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sales.data.meta.totalPages > 1 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-muted">
                Page {sales.data.meta.page} of {sales.data.meta.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-input border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={!sales.data.meta.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="rounded-input border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={!sales.data.meta.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </PageContainer>
  );
}
