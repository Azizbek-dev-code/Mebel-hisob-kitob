import { ProductStatus } from '@furniture-erp/shared';
import { ArrowLeft, Pencil, Sofa } from 'lucide-react';
import { useState, type ReactNode } from 'react';
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

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message || 'Qayta urinib ko‘ring.';
  return 'Qayta urinib ko‘ring.';
}

export function ProductDetailPage() {
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
            Mebellar
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            {product?.name ?? 'Mebel'}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {product?.sku ? `SKU: ${product.sku}` : 'SKU yo‘q'}
          </p>
        </div>
        {product ? (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-input border border-line px-3 py-2 text-sm hover:bg-surface-hover"
          >
            <Pencil className="size-4" />
            Tahrirlash
          </button>
        ) : null}
      </div>

      {detail.isError ? (
        <ErrorState
          title="Mahsulot topilmadi"
          message={errorMessage(detail.error)}
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
              <Info label="Kategoriya" value={product.categoryName ?? '—'} />
              <Info
                label="Holat"
                value={
                  <Badge tone={product.status === ProductStatus.ACTIVE ? 'success' : 'neutral'}>
                    {product.status === ProductStatus.ACTIVE ? 'Faol' : 'Arxiv'}
                  </Badge>
                }
              />
              <Info label="Sotuv narxi" value={formatMoney(product.defaultSalePrice)} />
              <Info label="Tannarx" value={formatMoney(product.costPrice)} />
              <Info
                label="Zaxira"
                value={
                  product.trackStock
                    ? `${product.stockQty} dona · ${stockStatusLabel(product.stockStatus)}`
                    : stockStatusLabel(product.stockStatus)
                }
              />
              <Info label="Min. zaxira" value={String(product.minStockQty)} />
              <Info label="Yaratilgan" value={formatDateTime(product.createdAt)} />
              <Info label="Yangilangan" value={formatDateTime(product.updatedAt)} />
              {product.description ? (
                <div className="sm:col-span-2">
                  <Info label="Tavsif" value={product.description} />
                </div>
              ) : null}
            </div>
          </div>

          <SectionCard title="Zaxira xulosasi" description="Harakatlar yig‘indisi">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
              <Stat label="Kirim" value={`${product.stockSummary.stockIn}`} />
              <Stat label="Sotilgan" value={`${product.stockSummary.sold}`} />
              <Stat label="Bekor/qaytarilgan" value={`${product.stockSummary.cancelledRestored}`} />
              <Stat label="Qo‘lda tuzatish" value={`${product.stockSummary.manualAdjustments}`} />
              <Stat label="Hozirgi" value={`${product.stockSummary.currentQty}`} />
            </dl>
            <p className="mt-3 text-xs text-ink-muted">
              Batafsil harakatlar uchun{' '}
              <Link to={ROUTES.inventory} className="text-brand-700 hover:underline">
                Ombor
              </Link>{' '}
              sahifasiga o‘ting.
            </p>
          </SectionCard>

          <SectionCard
            title="Sotuv xulosasi"
            description="ACTIVE|COMPLETED sotuvlar — SaleItem snapshot"
          >
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
              <Stat label="Sotuvlar" value={String(product.salesSummary.saleCount)} />
              <Stat label="Donalar" value={String(product.salesSummary.unitsSold)} />
              <Stat label="Daromad" value={formatMoney(product.salesSummary.revenue)} />
              <Stat label="COGS" value={formatMoney(product.salesSummary.cogs)} />
              <Stat label="Yalpi foyda" value={formatMoney(product.salesSummary.grossProfit)} />
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
