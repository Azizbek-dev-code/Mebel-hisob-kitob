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
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  useDeleteProduct,
  useProductCategories,
  useProductsList,
  useRestoreProduct,
} from '../hooks/use-products';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const PAGE_SIZE = 20;

type StatusChip = ProductCatalogueStatusFilter;
type StockChip = ProductCatalogueStockFilter;

function listErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return t('products.forbidden');
    return error.message || t('common.retry');
  }
  return t('common.retry');
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
  const { t } = useTranslation();
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
  const deleteProduct = useDeleteProduct();

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
    if (!window.confirm(t('products.archiveConfirm', { name: product.name }))) return;
    try {
      await archiveProduct.mutateAsync(product.id);
      setMessage(t('products.archivedMessage'));
    } catch (error) {
      setMessage(listErrorMessage(error, t));
    }
  }

  async function handleRestore(product: ProductListItem) {
    try {
      await restoreProduct.mutateAsync(product.id);
      setMessage(t('products.restoredMessage'));
    } catch (error) {
      setMessage(listErrorMessage(error, t));
    }
  }

  async function handleDeletePermanent(product: ProductListItem) {
    if (!window.confirm(t('products.deleteConfirm', { name: product.name }))) return;
    try {
      await deleteProduct.mutateAsync(product.id);
      setMessage(t('products.deletedMessage'));
    } catch (error) {
      setMessage(listErrorMessage(error, t));
    }
  }

  return (
    <PageContainer className="space-y-6">
      <div data-testid="products-page" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('products.title')}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t('products.subtitle')}</p>
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
            {t('products.new')}
          </WriteGuard>
        </div>

        {message ? (
          <p className="rounded-input border border-line bg-surface-muted px-3 py-2 text-sm text-ink">
            {message}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={t('products.totalProducts')}
            value={summary ? String(summary.totalProducts) : '—'}
            context={t('products.totalProductsHint')}
            icon={Sofa}
            isLoading={list.isLoading}
          />
          <KpiCard
            title={t('common.active')}
            value={summary ? String(summary.activeCount) : '—'}
            context={t('products.activeHint')}
            icon={Package}
            tone="success"
            isLoading={list.isLoading}
          />
          <KpiCard
            title={t('products.lowStock')}
            value={summary ? String(summary.lowStockCount) : '—'}
            context={t('products.lowStockHint')}
            icon={PackageMinus}
            tone="warning"
            isLoading={list.isLoading}
          />
          <KpiCard
            title={t('products.outOfStock')}
            value={summary ? String(summary.outOfStockCount) : '—'}
            context={t('products.outOfStockHint')}
            icon={PackageX}
            tone="danger"
            isLoading={list.isLoading}
          />
        </div>

        <SectionCard title={t('common.filters')} description={t('products.filtersHint')}>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                className={cn(fieldClass, 'pl-9')}
                placeholder={t('products.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-1" role="group" aria-label={t('common.status')}>
              {(
                [
                  ['ACTIVE', t('common.active')],
                  ['ARCHIVED', t('common.archived')],
                  ['ALL', t('common.all')],
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

            <div className="flex flex-wrap gap-1" role="group" aria-label={t('products.stock')}>
              {(
                [
                  ['ALL', t('products.stockAll')],
                  ['IN_STOCK', t('products.inStock')],
                  ['LOW_STOCK', t('products.low')],
                  ['OUT_OF_STOCK', t('products.outOfStock')],
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
              aria-label={t('products.category')}
            >
              <option value="">{t('common.allCategories')}</option>
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
            title={t('products.loadFailed')}
            message={listErrorMessage(list.error, t)}
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
            title={t('products.emptyTitle')}
            description={t('products.emptyDescription')}
          />
        ) : (
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-muted text-xs text-ink-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('products.singular')}</th>
                  <th className="px-3 py-2 font-medium">{t('products.sku')}</th>
                  <th className="px-3 py-2 font-medium">{t('products.category')}</th>
                  <th className="px-3 py-2 font-medium">{t('sales.totalSale')}</th>
                  <th className="px-3 py-2 font-medium">{t('sales.costPrice')}</th>
                  <th className="px-3 py-2 font-medium">{t('products.stock')}</th>
                  <th className="px-3 py-2 font-medium">{t('common.status')}</th>
                  <th className="px-3 py-2 font-medium">{t('common.actions')}</th>
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
                        {product.status === ProductStatus.ACTIVE
                          ? t('common.active')
                          : t('common.archived')}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Link
                          to={ROUTES.productDetail(product.id)}
                          className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs hover:bg-surface-hover"
                        >
                          <Eye className="size-3.5" />
                          {t('common.view')}
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
                          {t('common.edit')}
                        </button>
                        {product.status === ProductStatus.ACTIVE ? (
                          <button
                            type="button"
                            onClick={() => void handleArchive(product)}
                            className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"
                          >
                            <Archive className="size-3.5" />
                            {t('common.archive')}
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleRestore(product)}
                              className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs hover:bg-surface-hover"
                            >
                              {t('common.restore')}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeletePermanent(product)}
                              disabled={deleteProduct.isPending}
                              className="inline-flex items-center gap-1 rounded-input border border-danger-200 px-2 py-1 text-xs text-danger-700 hover:bg-danger-50 disabled:opacity-60"
                            >
                              <Trash2 className="size-3.5" />
                              {t('common.delete')}
                            </button>
                          </>
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
              {t('common.pageOf', { page: meta.page, total: meta.totalPages })}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-input border border-line px-2 py-1 disabled:opacity-50"
              >
                {t('common.previous')}
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-input border border-line px-2 py-1 disabled:opacity-50"
              >
                {t('common.next')}
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
        onSaved={() =>
          setMessage(editing ? t('products.updatedMessage') : t('products.createdMessage'))
        }
      />
    </PageContainer>
  );
}
