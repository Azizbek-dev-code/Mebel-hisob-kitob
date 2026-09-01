import { ProductStatus } from '@furniture-erp/shared';
import { ArrowLeft, Pencil, Sofa } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { formatDateTime, formatMoney } from '@/utils/format';
import { stockStatusLabel } from '@/features/inventory/utils/labels';

import { ProductFormDialog } from '../components/ProductFormDialog';
import { useProductDetail } from '../hooks/use-products';

function errorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiClientError) return error.message || t('common.retry');
  return t('common.retry');
}

export function ProductDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const detail = useProductDetail(id);
  const [editOpen, setEditOpen] = useState(false);
  const product = detail.data;

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to={ROUTES.products}
            className="mb-2 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            {t('products.title')}
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            {product?.name ?? t('products.singular')}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {product?.sku ? `SKU: ${product.sku}` : t('products.noSku')}
          </p>
        </div>
        {product ? (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-input border border-line px-3 py-2 text-sm hover:bg-surface-hover"
          >
            <Pencil className="size-4" />
            {t('common.edit')}
          </button>
        ) : null}
      </div>

      {detail.isError ? (
        <ErrorState
          title={t('products.notFound')}
          message={errorMessage(detail.error, t)}
          onRetry={() => void detail.refetch()}
        />
      ) : detail.isLoading || !product ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt=""
                className="aspect-square w-full max-w-[200px] rounded-card border border-line object-cover"
              />
            ) : (
              <div className="flex aspect-square max-w-[200px] items-center justify-center rounded-card border border-dashed border-line text-ink-muted">
                <Sofa className="size-10" />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Info label={t('products.category')} value={product.categoryName ?? '—'} />
              <Info
                label={t('common.status')}
                value={
                  <Badge tone={product.status === ProductStatus.ACTIVE ? 'success' : 'neutral'}>
                    {product.status === ProductStatus.ACTIVE
                      ? t('common.active')
                      : t('common.archived')}
                  </Badge>
                }
              />
              <Info label={t('sales.salePrice')} value={formatMoney(product.defaultSalePrice)} />
              <Info label={t('sales.costPrice')} value={formatMoney(product.costPrice)} />
              <Info
                label={t('products.stock')}
                value={
                  product.trackStock
                    ? `${product.stockQty} ${t('common.pcs')} · ${stockStatusLabel(product.stockStatus)}`
                    : stockStatusLabel(product.stockStatus)
                }
              />
              <Info label={t('products.minStock')} value={String(product.minStockQty)} />
              <Info label={t('common.createdAt')} value={formatDateTime(product.createdAt)} />
              <Info label={t('common.updatedAt')} value={formatDateTime(product.updatedAt)} />
              {product.description ? (
                <div className="sm:col-span-2">
                  <Info label={t('common.description')} value={product.description} />
                </div>
              ) : null}
            </div>
          </div>

          <SectionCard
            title={t('products.stockSummary')}
            description={t('products.stockSummaryHint')}
          >
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
              <Stat label={t('products.stockIn')} value={`${product.stockSummary.stockIn}`} />
              <Stat label={t('products.sold')} value={`${product.stockSummary.sold}`} />
              <Stat
                label={t('products.cancelledRestored')}
                value={`${product.stockSummary.cancelledRestored}`}
              />
              <Stat
                label={t('products.manualAdjustments')}
                value={`${product.stockSummary.manualAdjustments}`}
              />
              <Stat label={t('products.currentQty')} value={`${product.stockSummary.currentQty}`} />
            </dl>
            <p className="mt-3 text-xs text-ink-muted">
              {t('products.inventoryLinkHint')}{' '}
              <Link to={ROUTES.inventory} className="text-brand-700 hover:underline">
                {t('inventory.title')}
              </Link>
            </p>
          </SectionCard>

          <SectionCard
            title={t('products.salesSummary')}
            description={t('products.salesSummaryHint')}
          >
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
              <Stat label={t('sales.title')} value={String(product.salesSummary.saleCount)} />
              <Stat label={t('products.units')} value={String(product.salesSummary.unitsSold)} />
              <Stat label={t('products.revenue')} value={formatMoney(product.salesSummary.revenue)} />
              <Stat label={t('products.cogs')} value={formatMoney(product.salesSummary.cogs)} />
              <Stat
                label={t('sales.grossProfit')}
                value={formatMoney(product.salesSummary.grossProfit)}
              />
            </dl>
          </SectionCard>
        </>
      )}

      {product ? (
        <ProductFormDialog
          mode="edit"
          product={product}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => void detail.refetch()}
        />
      ) : null}
    </PageContainer>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-input border border-line px-3 py-2">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{value}</dd>
    </div>
  );
}
