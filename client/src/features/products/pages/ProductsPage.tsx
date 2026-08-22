import {
  ProductStatus,
  StockStatus,
  type ProductCatalogueStockFilter,
  type ProductCatalogueStatusFilter,
  type ProductListItem,
} from '@furniture-erp/shared';
import {
  Archive,
  Eye,
  Package,
  PackageMinus,
  PackageX,
  Pencil,
  Plus,
  Search,
  Sofa,
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
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { formatMoney } from '@/utils/format';
import { stockStatusLabel } from '@/features/inventory/utils/labels';

import { ProductFormDialog } from '../components/ProductFormDialog';
import {
  useArchiveProduct,
  useProductCategories,
  useProductsList,
  useRestoreProduct,
} from '../hooks/use-products';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const PAGE_SIZE = 20;

type StatusChip = ProductCatalogueStatusFilter;
type StockChip = ProductCatalogueStockFilter;

function listErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'Mebel katalogini ko‘rish uchun ruxsat yo‘q.';
    return error.message || 'Qayta urinib ko‘ring.';
  }
  return 'Qayta urinib ko‘ring.';
}

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === ProductStatus.ACTIVE) return 'success';
  if (status === ProductStatus.ARCHIVED) return 'neutral';
  return 'neutral';
}

function stockTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === StockStatus.IN_STOCK) return 'success';
  if (status === StockStatus.LOW_STOCK) return 'warning';
  if (status === StockStatus.OUT_OF_STOCK) return 'danger';
  return 'neutral';
}

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<StatusChip>('ACTIVE');
  const [stockFilter, setStockFilter] = useState<StockChip>('ALL');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductListItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const categories = useProductCategories(false);
  const archiveProduct = useArchiveProduct();
  const restoreProduct = useRestoreProduct();

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, stockFilter, categoryId]);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(t);
  }, [message]);

  const query = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status,
      stockFilter: stockFilter === 'ALL' ? undefined : stockFilter,
      categoryId: categoryId || undefined,
    }),
    [page, debouncedSearch, status, stockFilter, categoryId],
  );

  const list = useProductsList(query);
  const summary = list.data?.summary;
  const items = list.data?.items ?? [];
  const meta = list.data?.meta;

  async function handleArchive(product: ProductListItem) {
    if (!window.confirm(`“${product.name}” ni arxivlashni tasdiqlaysizmi?`)) return;
    try {
      await archiveProduct.mutateAsync(product.id);
      setMessage('Mahsulot arxivlandi — yangi sotuvlarda chiqmaydi.');
    } catch (error) {
      setMessage(listErrorMessage(error));
    }
  }

  async function handleRestore(product: ProductListItem) {
    try {
      await restoreProduct.mutateAsync(product.id);
      setMessage('Mahsulot yana faol.');
    } catch (error) {
      setMessage(listErrorMessage(error));
    }
  }

  return (
    <PageContainer className="space-y-6">
      <div data-testid="products-page" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Mebellar</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Katalog — narx, kategoriya va holat. Zaxira Ombor orqali kiritiladi.
            </p>
          </div>
          <WriteGuard
            feature="products"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="size-4" aria-hidden="true" />
            Yangi mebel
          </WriteGuard>
        </div>

        {message ? (
          <p className="rounded-input border border-line bg-surface-muted px-3 py-2 text-sm text-ink">
            {message}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Jami mebel"
            value={summary ? String(summary.totalProducts) : '—'}
            context="Katalogdagi barcha SKU"
            icon={Sofa}
            isLoading={list.isLoading}
          />
          <KpiCard
            title="Faol"
            value={summary ? String(summary.activeCount) : '—'}
            context="Sotuvga ochiq"
            icon={Package}
            tone="success"
            isLoading={list.isLoading}
          />
          <KpiCard
            title="Kam qolgan"
            value={summary ? String(summary.lowStockCount) : '—'}
            context="Faol + past zaxira"
            icon={PackageMinus}
            tone="warning"
            isLoading={list.isLoading}
          />
          <KpiCard
            title="Tugagan"
            value={summary ? String(summary.outOfStockCount) : '—'}
            context="Faol + 0 dona"
            icon={PackageX}
            tone="danger"
            isLoading={list.isLoading}
          />
        </div>

        <SectionCard title="Filtrlar" description="Qidiruv va holat">
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                className={cn(fieldClass, 'pl-9')}
                placeholder="Nomi yoki SKU"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-1" role="group" aria-label="Holat">
              {(
                [
                  ['ACTIVE', 'Faol'],
                  ['ARCHIVED', 'Arxiv'],
                  ['ALL', 'Hammasi'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatus(id)}
                  className={cn(
                    'rounded-[0.4rem] px-2.5 py-1.5 text-xs font-medium sm:text-sm',
                    status === id
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-soft hover:bg-surface-hover',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1" role="group" aria-label="Zaxira">
              {(
                [
                  ['ALL', 'Zaxira: hammasi'],
                  ['IN_STOCK', 'Mavjud'],
                  ['LOW_STOCK', 'Kam'],
                  ['OUT_OF_STOCK', 'Tugagan'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStockFilter(id)}
                  className={cn(
                    'rounded-[0.4rem] px-2.5 py-1.5 text-xs font-medium sm:text-sm',
                    stockFilter === id
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-soft hover:bg-surface-hover',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              className={cn(fieldClass, 'max-w-xs')}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              aria-label="Kategoriya"
            >
              <option value="">Barcha kategoriyalar</option>
              {(categories.data ?? []).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </SectionCard>

        {list.isError ? (
          <ErrorState
            title="Katalogni yuklab bo‘lmadi"
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
            icon={Sofa}
            title="Mebel topilmadi"
            description="Yangi mebel qo‘shing yoki filtrni o‘zgartiring."
          />
        ) : (
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-muted text-xs text-ink-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Mebel</th>
                  <th className="px-3 py-2 font-medium">SKU</th>
                  <th className="px-3 py-2 font-medium">Kategoriya</th>
                  <th className="px-3 py-2 font-medium">Sotuv</th>
                  <th className="px-3 py-2 font-medium">Tannarx</th>
                  <th className="px-3 py-2 font-medium">Zaxira</th>
                  <th className="px-3 py-2 font-medium">Holat</th>
                  <th className="px-3 py-2 font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => (
                  <tr key={product.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt=""
                            className="size-10 shrink-0 rounded-input object-cover"
                          />
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-input bg-surface-muted text-ink-muted">
                            <Sofa className="size-4" />
                          </div>
                        )}
                        <span className="font-medium text-ink">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-ink-soft">{product.sku ?? '—'}</td>
                    <td className="px-3 py-2 text-ink-soft">{product.categoryName ?? '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatMoney(product.defaultSalePrice)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatMoney(product.costPrice)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={stockTone(product.stockStatus)}>
                        {product.trackStock
                          ? `${product.stockQty} · ${stockStatusLabel(product.stockStatus)}`
                          : stockStatusLabel(product.stockStatus)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={statusTone(product.status)}>
                        {product.status === ProductStatus.ACTIVE ? 'Faol' : 'Arxiv'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Link
                          to={ROUTES.productDetail(product.id)}
                          className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs hover:bg-surface-hover"
                        >
                          <Eye className="size-3.5" />
                          Ko‘rish
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(product);
                            setFormOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs hover:bg-surface-hover"
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </button>
                        {product.status === ProductStatus.ACTIVE ? (
                          <button
                            type="button"
                            onClick={() => void handleArchive(product)}
                            className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"
                          >
                            <Archive className="size-3.5" />
                            Arxiv
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleRestore(product)}
                            className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs hover:bg-surface-hover"
                          >
                            Tiklash
                          </button>
                        )}
                      </div>
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

      <ProductFormDialog
        mode={editing ? 'edit' : 'create'}
        product={editing}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => setMessage(editing ? 'Mebel yangilandi.' : 'Yangi mebel qo‘shildi.')}
      />
    </PageContainer>
  );
}
