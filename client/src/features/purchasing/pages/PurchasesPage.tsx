import {
  type PurchaseListPaymentFilter,
} from '@furniture-erp/shared';
import { PackagePlus, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { formatDate, formatMoney, formatMoneyCompact } from '@/utils/format';
import {
  purchaseListFilterLabel,
  purchasePaymentStatusLabel,
  purchasePaymentStatusTone,
} from '@/utils/purchasing';

import { usePurchasesList } from '../hooks/use-purchasing';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const PAGE_SIZE = 20;

const FILTERS: PurchaseListPaymentFilter[] = [
  'ALL',
  'PAID',
  'PARTIALLY_PAID',
  'UNPAID',
  'CANCELLED',
];

function listErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'Kirimlarni ko‘rish uchun ruxsat yo‘q.';
    return error.message || 'Qayta urinib ko‘ring.';
  }
  return 'Qayta urinib ko‘ring.';
}

export function PurchasesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PurchaseListPaymentFilter>('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, paymentFilter]);

  const query = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      paymentFilter: paymentFilter === 'ALL' ? undefined : paymentFilter,
    }),
    [page, debouncedSearch, paymentFilter],
  );

  const list = usePurchasesList(query);
  const items = list.data?.items ?? [];
  const meta = list.data?.meta;

  return (
    <PageContainer className="space-y-6">
      <div data-testid="purchases-page" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Kirimlar</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Yetkazuvchidan omborga kirim, to‘lov va kredit.
            </p>
          </div>
          <WriteGuard
            to={ROUTES.purchaseNew}
            feature="purchases"
            className="inline-flex items-center justify-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="size-4" aria-hidden="true" />
            Yangi kirim
          </WriteGuard>
        </div>

        <SectionCard title="Filtrlar" description="Qidiruv va to‘lov holati">
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                className={cn(fieldClass, 'pl-9')}
                placeholder="Kirim raqami yoki yetkazuvchi"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="purchases-search"
              />
            </div>

            <div className="flex flex-wrap gap-1" role="group" aria-label="To‘lov holati">
              {FILTERS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentFilter(id)}
                  className={cn(
                    'rounded-[0.4rem] px-2.5 py-1.5 text-xs font-medium sm:text-sm',
                    paymentFilter === id
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-soft hover:bg-surface-hover',
                  )}
                >
                  {purchaseListFilterLabel(id)}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {list.isError ? (
          <ErrorState
            title="Kirimlarni yuklab bo‘lmadi"
            message={listErrorMessage(list.error)}
            onRetry={() => void list.refetch()}
          />
        ) : list.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={PackagePlus}
            title="Kirim topilmadi"
            description="Yangi kirim yarating yoki filtrni o‘zgartiring."
          />
        ) : (
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-muted text-xs text-ink-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">№</th>
                  <th className="px-3 py-2 font-medium">Sana</th>
                  <th className="px-3 py-2 font-medium">Yetkazuvchi</th>
                  <th className="px-3 py-2 font-medium">Mahsulotlar</th>
                  <th className="px-3 py-2 font-medium">Jami</th>
                  <th className="px-3 py-2 font-medium">To‘langan</th>
                  <th className="px-3 py-2 font-medium">Qoldiq</th>
                  <th className="px-3 py-2 font-medium">Holat</th>
                </tr>
              </thead>
              <tbody>
                {items.map((purchase) => (
                  <tr key={purchase.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        to={ROUTES.purchaseDetail(purchase.id)}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        #{purchase.purchaseNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div>
                        {formatDate(purchase.deliveredAt ?? purchase.purchaseDate)}
                      </div>
                      {purchase.driverFee > 0 ? (
                        <div className="text-xs text-ink-muted">
                          Shopir: {formatMoneyCompact(purchase.driverFee)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        to={ROUTES.supplierDetail(purchase.supplierId)}
                        className="text-ink hover:underline"
                      >
                        {purchase.supplierName}
                      </Link>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{purchase.itemCount}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatMoney(purchase.totalCost)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatMoney(purchase.paidAmount)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatMoney(purchase.remainingAmount)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        tone={purchasePaymentStatusTone(
                          purchase.paymentStatus,
                          purchase.status,
                        )}
                      >
                        {purchasePaymentStatusLabel(
                          purchase.paymentStatus,
                          purchase.status,
                        )}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">
              Sahifa {meta.page} / {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-input border border-line px-2 py-1 disabled:opacity-50"
              >
                Oldingi
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-input border border-line px-2 py-1 disabled:opacity-50"
              >
                Keyingi
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
