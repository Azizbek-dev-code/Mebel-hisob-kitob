import { SellerCommissionStatus, type SellerCommissionStatus as SellerStatus } from '@furniture-erp/shared';
import { ShoppingCart } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { SellerSalesTable } from '@/features/workers/components/SellerSalesTable';
import { useMySales } from '@/features/workers/hooks/use-workers';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export function MySalesPage() {
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({
      page,
      pageSize: 20,
      search: search.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
      status: status === 'ALL' ? 'ALL' : status,
    }),
    [page, search, from, to, status],
  );

  const sales = useMySales(params);
  const items = sales.data?.items ?? [];

  return (
    <PageContainer className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Mening sotuvlarim</h2>
        <p className="mt-1 text-sm text-ink-muted">Faqat siz biriktirilgan savdolar.</p>
      </div>

      <SectionCard title="Filtr">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input
            className={fieldClass}
            placeholder="Mijoz yoki sotuv raqami"
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
            aria-label="Boshlanish sanasi"
          />
          <input
            type="date"
            className={fieldClass}
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            aria-label="Tugash sanasi"
          />
          <select
            className={fieldClass}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Sotuv holati"
          >
            <option value="ALL">Barchasi</option>
            <option value="OPEN">Faol</option>
            <option value="COMPLETED">Yakunlangan</option>
            <option value="CANCELLED">Bekor qilingan</option>
          </select>
        </div>
      </SectionCard>

      {sales.isError ? (
        <ErrorState
          title="Sotuvlar yuklanmadi"
          message={sales.error instanceof Error ? sales.error.message : 'Qayta urinib ko‘ring.'}
          retryLabel="Qayta urinish"
          onRetry={() => void sales.refetch()}
        />
      ) : null}

      {sales.isLoading ? <Skeleton className="h-40 w-full" /> : null}

      {sales.data && items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Hali sotuv yo‘q"
          description="Sizni sotuvchi sifatida tanlaganda savdolar shu yerda chiqadi."
        />
      ) : null}

      {sales.data && items.length > 0 ? (
        <>
          <SectionCard title="Sotuvlar">
            <SellerSalesTable
              items={items.map((sale) => ({
                ...sale,
                totalCostPrice: sale.totalCostPrice ?? 0,
                netProfit: sale.netProfit ?? 0,
                estimatedCommission: sale.estimatedCommission ?? 0,
                earnedCommission: sale.earnedCommission ?? 0,
                commissionStatus: (sale.commissionStatus ??
                  SellerCommissionStatus.NONE) as SellerStatus,
                ruleType: sale.ruleType ?? null,
                rateLabel: sale.rateLabel ?? null,
              }))}
            />
          </SectionCard>

          {sales.data.meta.totalPages > 1 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-muted">
                {sales.data.meta.page}-sahifa / {sales.data.meta.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-input border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={!sales.data.meta.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Oldingi
                </button>
                <button
                  type="button"
                  className="rounded-input border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={!sales.data.meta.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Keyingi
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </PageContainer>
  );
}
