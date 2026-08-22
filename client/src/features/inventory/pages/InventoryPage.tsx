import {
  StockStatus,
  type InventoryListItem,
  type InventoryStockFilter,
} from '@furniture-erp/shared';
import {
  AlertTriangle,
  Boxes,
  Package,
  PackageMinus,
  PackagePlus,
  PackageX,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { cn } from '@/lib/cn';

import { StockActionDialog, type StockActionMode } from '../components/StockActionDialog';
import { useInventoryList, useStockHistory } from '../hooks/use-inventory';
import {
  formatMovementDate,
  movementTypeLabel,
  stockQtyLabel,
  stockStatusLabel,
} from '../utils/labels';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const FILTERS: Array<{ id: InventoryStockFilter; label: string }> = [
  { id: 'ALL', label: 'Hammasi' },
  { id: 'IN_STOCK', label: 'Mavjud' },
  { id: 'LOW_STOCK', label: 'Kam qolgan' },
  { id: 'OUT_OF_STOCK', label: 'Tugagan' },
];

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === StockStatus.IN_STOCK) return 'success';
  if (status === StockStatus.LOW_STOCK) return 'warning';
  if (status === StockStatus.OUT_OF_STOCK) return 'danger';
  return 'neutral';
}

function listErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'Ombor sahifasini ko‘rish uchun ruxsat yo‘q.';
    return error.message || 'Qayta urinib ko‘ring.';
  }
  return 'Qayta urinib ko‘ring.';
}

export function InventoryPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<InventoryStockFilter>('ALL');
  const [action, setAction] = useState<{ mode: StockActionMode; product: InventoryListItem } | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<'stock' | 'history'>('stock');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const list = useInventoryList({
    page: 1,
    pageSize: 100,
    search: debouncedSearch || undefined,
    stockFilter,
  });

  const history = useStockHistory({
    page: 1,
    pageSize: 50,
    search: debouncedSearch || undefined,
    productId: selectedId ?? undefined,
  });

  const summary = list.data?.summary;
  const items = list.data?.items ?? [];

  const selected = useMemo(
    () => (list.data?.items ?? []).find((item) => item.id === selectedId) ?? null,
    [list.data?.items, selectedId],
  );

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Ombor</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Mahsulot zaxirasi, kirim-chiqim va harakatlar tarixi.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('stock')}
            className={cn(
              'rounded-input px-3 py-2 text-sm font-medium',
              tab === 'stock'
                ? 'bg-brand-600 text-white'
                : 'border border-line text-ink hover:bg-surface-hover',
            )}
          >
            Zaxira
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={cn(
              'rounded-input px-3 py-2 text-sm font-medium',
              tab === 'history'
                ? 'bg-brand-600 text-white'
                : 'border border-line text-ink hover:bg-surface-hover',
            )}
          >
            Tarix
          </button>
        </div>
      </div>

      {successMessage ? (
        <div className="rounded-input border border-success-100 bg-success-50 px-3 py-2 text-sm text-success-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Jami mahsulot"
          context="Kuzatiladigan"
          value={String(summary?.totalProducts ?? 0)}
          icon={Package}
          tone="brand"
          isLoading={list.isLoading}
        />
        <KpiCard
          title="Jami birlik"
          context="Omborda"
          value={String(summary?.totalUnits ?? 0)}
          icon={Boxes}
          tone="info"
          isLoading={list.isLoading}
        />
        <KpiCard
          title="Kam qolgan"
          context="Minimaldan past"
          value={String(summary?.lowStockCount ?? 0)}
          icon={AlertTriangle}
          tone="warning"
          isLoading={list.isLoading}
        />
        <KpiCard
          title="Tugagan"
          context="0 dona"
          value={String(summary?.outOfStockCount ?? 0)}
          icon={PackageX}
          tone="danger"
          isLoading={list.isLoading}
        />
      </div>

      <SectionCard title="Qidiruv va filtr">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              className={`${fieldClass} pl-9`}
              placeholder="Nomi yoki SKU"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStockFilter(filter.id)}
                className={cn(
                  'rounded-input px-3 py-2 text-xs font-medium',
                  stockFilter === filter.id
                    ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                    : 'border border-line text-ink-muted hover:bg-surface-hover',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {tab === 'stock' ? (
        <SectionCard title="Mahsulotlar">
          {list.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : list.isError ? (
            <ErrorState title="Ombor yuklanmadi" message={listErrorMessage(list.error)} />
          ) : items.length === 0 ? (
            <EmptyState
              title="Mahsulot topilmadi"
              description="Qidiruv yoki filtrni o‘zgartiring."
              icon={Package}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-2 py-2 font-medium">Mahsulot</th>
                    <th className="px-2 py-2 font-medium">SKU</th>
                    <th className="px-2 py-2 font-medium">Zaxira</th>
                    <th className="px-2 py-2 font-medium">Min</th>
                    <th className="px-2 py-2 font-medium">Holat</th>
                    <th className="px-2 py-2 font-medium">Oxirgi</th>
                    <th className="px-2 py-2 font-medium">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={cn(
                        'border-b border-line/70',
                        selectedId === item.id && 'bg-brand-50/40',
                      )}
                    >
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          className="text-left font-medium text-ink hover:text-brand-700"
                          onClick={() => setSelectedId(item.id)}
                        >
                          {item.name}
                        </button>
                      </td>
                      <td className="px-2 py-3 text-ink-muted">{item.sku ?? '—'}</td>
                      <td className="px-2 py-3 font-medium">{stockQtyLabel(item.stockQty)}</td>
                      <td className="px-2 py-3 text-ink-muted">{item.minStockQty}</td>
                      <td className="px-2 py-3">
                        <Badge tone={statusTone(item.stockStatus)}>
                          {stockStatusLabel(item.stockStatus)}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-xs text-ink-muted">
                        {item.lastMovementAt
                          ? `${formatMovementDate(item.lastMovementAt)}${
                              item.lastMovementType
                                ? ` · ${movementTypeLabel(item.lastMovementType)}`
                                : ''
                            }`
                          : '—'}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs hover:bg-surface-hover"
                            onClick={() => setAction({ mode: 'in', product: item })}
                          >
                            <PackagePlus className="size-3.5" />
                            Kirim
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs hover:bg-surface-hover"
                            onClick={() => setAction({ mode: 'out', product: item })}
                          >
                            <PackageMinus className="size-3.5" />
                            Chiqim
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs hover:bg-surface-hover"
                            onClick={() => setAction({ mode: 'adjust', product: item })}
                          >
                            Tuzatish
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : (
        <SectionCard title="Zaxira tarixi">
          {history.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : history.isError ? (
            <ErrorState title="Tarix yuklanmadi" message={listErrorMessage(history.error)} />
          ) : (history.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              title="Harakat yo‘q"
              description="Hali zaxira o‘zgarishi qayd etilmagan."
              icon={Boxes}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-2 py-2 font-medium">Sana</th>
                    <th className="px-2 py-2 font-medium">Mahsulot</th>
                    <th className="px-2 py-2 font-medium">Harakat</th>
                    <th className="px-2 py-2 font-medium">Miqdor</th>
                    <th className="px-2 py-2 font-medium">Oldin → Keyin</th>
                    <th className="px-2 py-2 font-medium">Sabab</th>
                    <th className="px-2 py-2 font-medium">Foydalanuvchi</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data?.items.map((row) => (
                    <tr key={row.id} className="border-b border-line/70">
                      <td className="px-2 py-3 whitespace-nowrap">
                        {formatMovementDate(row.createdAt)}
                      </td>
                      <td className="px-2 py-3">{row.productName}</td>
                      <td className="px-2 py-3">{movementTypeLabel(row.movementType)}</td>
                      <td className="px-2 py-3 font-medium">
                        {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
                      </td>
                      <td className="px-2 py-3 text-ink-muted">
                        {row.quantityBefore} → {row.quantityAfter}
                      </td>
                      <td className="px-2 py-3 text-ink-muted">{row.reason ?? '—'}</td>
                      <td className="px-2 py-3 text-ink-muted">
                        {row.createdBy?.fullName ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {selected ? (
        <SectionCard
          title={selected.name}
          description={`${stockQtyLabel(selected.stockQty)} · ${stockStatusLabel(selected.stockStatus)}`}
          action={
            <Link
              to={ROUTES.sales}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Sotuvlarga
            </Link>
          }
        >
          <dl className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-ink-muted">Joriy zaxira</dt>
              <dd className="mt-0.5 font-semibold text-ink">{stockQtyLabel(selected.stockQty)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Minimal</dt>
              <dd className="mt-0.5 font-semibold text-ink">{selected.minStockQty} dona</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Holat</dt>
              <dd className="mt-0.5">
                <Badge tone={statusTone(selected.stockStatus)}>
                  {stockStatusLabel(selected.stockStatus)}
                </Badge>
              </dd>
            </div>
          </dl>
        </SectionCard>
      ) : null}

      {action ? (
        <StockActionDialog
          mode={action.mode}
          product={action.product}
          onClose={() => setAction(null)}
          onSuccess={setSuccessMessage}
        />
      ) : null}
    </PageContainer>
  );
}
