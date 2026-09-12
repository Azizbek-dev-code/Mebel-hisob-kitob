import {
  FulfilmentStatus,
  type DeliveryLedgerStatus,
  type DeliveryOpsSourceFilter,
  type DeliveryOpsStatusFilter,
  type PurchaseDeliveryOpsItem,
  type SaleDeliveryOpsItem,
} from '@furniture-erp/shared';
import { CheckCircle2, Loader2, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatMoney } from '@/utils/format';
import {
  deliveryStatusLabel,
  deliveryStatusTone,
  formatSaleNumber,
} from '@/utils/sales';

import { useMyDeliveries, useUpdatePurchaseDeliveryStatus, useUpdateSaleDeliveryStatus } from '../hooks/use-sales';

type StatusFilter = DeliveryOpsStatusFilter;
type SourceFilter = DeliveryOpsSourceFilter;

function matchesStatusFilter(status: FulfilmentStatus, filter: StatusFilter): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'PENDING') {
    return status === FulfilmentStatus.PENDING || status === FulfilmentStatus.SCHEDULED;
  }
  if (filter === 'IN_PROGRESS') return status === FulfilmentStatus.IN_TRANSIT;
  if (filter === 'COMPLETED') return status === FulfilmentStatus.COMPLETED;
  if (filter === 'CANCELLED') return status === FulfilmentStatus.CANCELLED;
  return true;
}

function matchesPurchaseStatusFilter(
  status: PurchaseDeliveryOpsItem['status'],
  filter: StatusFilter,
): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'PENDING') return status === 'PENDING';
  if (filter === 'IN_PROGRESS') return false;
  if (filter === 'COMPLETED') return status === 'COMPLETED';
  if (filter === 'CANCELLED') return status === 'CANCELLED';
  return true;
}

function ledgerStatusLabel(status: DeliveryLedgerStatus): string {
  switch (status) {
    case 'POSTED':
      return 'Hisobga tushdi';
    case 'PENDING':
      return 'Kutilmoqda';
    case 'REVERSED':
      return 'Bekor qilingan';
    default:
      return '—';
  }
}

/**
 * Shopir operational inbox — sale deliveries (start/complete) + purchase
 * pickups (complete when goods arrive). Ledger posting stays on the server.
 */
export function DeliveryPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [completeTarget, setCompleteTarget] = useState<SaleDeliveryOpsItem | null>(null);
  const [completePurchaseTarget, setCompletePurchaseTarget] =
    useState<PurchaseDeliveryOpsItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const deliveries = useMyDeliveries();
  const updateDelivery = useUpdateSaleDeliveryStatus();
  const updatePurchaseDelivery = useUpdatePurchaseDeliveryStatus();

  const saleItems = useMemo(() => {
    const items = deliveries.data?.saleDeliveries ?? [];
    if (sourceFilter === 'PURCHASE') return [];
    return items.filter((item) => matchesStatusFilter(item.status, statusFilter));
  }, [deliveries.data?.saleDeliveries, sourceFilter, statusFilter]);

  const purchaseItems = useMemo(() => {
    const items = deliveries.data?.purchaseDeliveries ?? [];
    if (sourceFilter === 'SALE') return [];
    return items.filter((item) => matchesPurchaseStatusFilter(item.status, statusFilter));
  }, [deliveries.data?.purchaseDeliveries, sourceFilter, statusFilter]);

  const isEmpty = saleItems.length === 0 && purchaseItems.length === 0;
  const kpis = deliveries.data?.kpis;

  async function handleStart(item: SaleDeliveryOpsItem) {
    setActionError(null);
    setActionSuccess(null);
    try {
      const result = await updateDelivery.mutateAsync({
        saleId: item.saleId,
        body: { status: 'IN_TRANSIT' },
      });
      setActionSuccess(result.message || 'Yetkazib berish boshlandi');
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Yetkazib berishni boshlab bo‘lmadi.'));
    }
  }

  async function handleConfirmComplete() {
    if (!completeTarget) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      const result = await updateDelivery.mutateAsync({
        saleId: completeTarget.saleId,
        body: { status: 'COMPLETED' },
      });
      setActionSuccess(result.message);
      setCompleteTarget(null);
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Yetkazib berishni yakunlab bo‘lmadi.'));
    }
  }

  async function handleConfirmPurchaseComplete() {
    if (!completePurchaseTarget) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      const result = await updatePurchaseDelivery.mutateAsync({
        purchaseId: completePurchaseTarget.id,
        body: { status: 'COMPLETED' },
      });
      setActionSuccess(result.message);
      setCompletePurchaseTarget(null);
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Kirim yetkazib berishni yakunlab bo‘lmadi.'));
    }
  }

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Yetkazib berishlar</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Sizga biriktirilgan sotuv va kirim yetkazib berishlari. Ishni shu yerdan boshlang va
          yakunlang.
        </p>
        <Link
          to={ROUTES.profileFinances}
          className="mt-2 inline-flex text-sm font-medium text-brand-700 hover:underline"
        >
          Mening moliyam →
        </Link>
      </div>

      {kpis ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4" data-testid="delivery-kpis">
          <KpiMini label="Bugun jami" value={String(kpis.todayTotal)} />
          <KpiMini label="Kutilmoqda" value={String(kpis.todayPending)} />
          <KpiMini label="Jarayonda" value={String(kpis.todayInProgress)} />
          <KpiMini label="Yakunlangan" value={String(kpis.todayCompleted)} />
          <KpiMini label="Bugungi haq" value={formatMoney(kpis.todayEarned)} emphasize />
          <KpiMini label="Bu oy jami" value={String(kpis.monthTotal)} />
          <KpiMini label="Bu oy topilgan" value={formatMoney(kpis.monthEarned)} emphasize />
          <KpiMini label="To‘langan (oy)" value={formatMoney(kpis.monthPaid)} />
          <KpiMini label="Qolgan" value={formatMoney(kpis.monthOutstanding)} />
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" data-testid="delivery-status-filters">
          {(
            [
              ['ALL', 'Barchasi'],
              ['PENDING', 'Kutilmoqda'],
              ['IN_PROGRESS', 'Jarayonda'],
              ['COMPLETED', 'Yakunlangan'],
              ['CANCELLED', 'Bekor'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-input border px-3 py-1.5 text-sm ${
                statusFilter === value
                  ? 'border-brand-500 bg-brand-50 text-brand-800'
                  : 'border-line text-ink-soft hover:bg-surface-hover'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" data-testid="delivery-source-filters">
          {(
            [
              ['ALL', 'Barchasi'],
              ['SALE', 'Sotuvlar'],
              ['PURCHASE', 'Kirimlar'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSourceFilter(value)}
              className={`rounded-input border px-3 py-1.5 text-sm ${
                sourceFilter === value
                  ? 'border-brand-500 bg-brand-50 text-brand-800'
                  : 'border-line text-ink-soft hover:bg-surface-hover'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {actionSuccess ? (
        <p role="status" className="rounded-input border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-800">
          {actionSuccess}
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" className="text-sm text-danger-600">
          {actionError}
        </p>
      ) : null}

      {deliveries.isError ? (
        <ErrorState
          title="Yetkazib berishlarni yuklashda xatolik yuz berdi."
          message={
            deliveries.error instanceof Error
              ? deliveries.error.message
              : 'Qayta urinib ko‘ring.'
          }
          retryLabel="Qayta urinish"
          onRetry={() => void deliveries.refetch()}
        />
      ) : null}

      {deliveries.isLoading ? (
        <div className="space-y-3" data-testid="delivery-loading">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : null}

      {deliveries.data && isEmpty ? (
        <EmptyState
          icon={Truck}
          title="Bugun sizga yetkazib berish tayinlanmagan."
          description="Yangi vazifa biriktirilganda shu yerda chiqadi. Kirimlar uchun «Kirimlar» filtrini ham tekshiring."
        />
      ) : null}

      {deliveries.data && !isEmpty ? (
        <div className="space-y-6">
          {saleItems.length > 0 ? (
            <section className="space-y-3" data-testid="sale-deliveries-section">
              <h3 className="text-base font-semibold text-ink">Sotuv yetkazib berishlari</h3>
              {saleItems.map((item) => (
                <div key={`sale-${item.id}`} data-testid={`sale-delivery-card-${item.saleId}`}>
                  <SaleDeliveryCard
                    item={item}
                    busy={updateDelivery.isPending}
                    onStart={() => void handleStart(item)}
                    onComplete={() => setCompleteTarget(item)}
                  />
                </div>
              ))}
            </section>
          ) : null}
          {purchaseItems.length > 0 ? (
            <section className="space-y-3" data-testid="purchase-deliveries-section">
              <h3 className="text-base font-semibold text-ink">Kirim yetkazib berishlari</h3>
              {purchaseItems.map((item) => (
                <div key={`purchase-${item.id}`} data-testid={`purchase-delivery-card-${item.id}`}>
                  <PurchaseDeliveryCard
                    item={item}
                    busy={updatePurchaseDelivery.isPending}
                    onComplete={() => setCompletePurchaseTarget(item)}
                  />
                </div>
              ))}
            </section>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(completeTarget)}
        title="Yetkazib berishni yakunlash"
        message={
          completeTarget ? (
            <span>
              Yetkazib berish haqiqatan mijozga topshirildimi?
              {completeTarget.fee > 0
                ? ` Shopir haqi ${formatMoney(completeTarget.fee)} hisobga olinadi.`
                : ''}
            </span>
          ) : null
        }
        confirmLabel={updateDelivery.isPending ? 'Yakunlanmoqda…' : 'Yakunlash'}
        cancelLabel="Bekor qilish"
        busy={updateDelivery.isPending}
        onConfirm={() => void handleConfirmComplete()}
        onCancel={() => !updateDelivery.isPending && setCompleteTarget(null)}
      />
      <ConfirmDialog
        open={Boolean(completePurchaseTarget)}
        title="Kirim yetkazib berishni yakunlash"
        message={
          completePurchaseTarget ? (
            <span>
              Yuk haqiqatan do‘konga olib kelindimi?
              {completePurchaseTarget.fee > 0
                ? ` Shopir haqi ${formatMoney(completePurchaseTarget.fee)} hisobga olinadi.`
                : ''}
            </span>
          ) : null
        }
        confirmLabel={updatePurchaseDelivery.isPending ? 'Yakunlanmoqda…' : 'Yakunlash'}
        cancelLabel="Bekor qilish"
        busy={updatePurchaseDelivery.isPending}
        onConfirm={() => void handleConfirmPurchaseComplete()}
        onCancel={() => !updatePurchaseDelivery.isPending && setCompletePurchaseTarget(null)}
      />
    </PageContainer>
  );
}

function SaleDeliveryCard({
  item,
  busy,
  onStart,
  onComplete,
}: {
  item: SaleDeliveryOpsItem;
  busy: boolean;
  onStart: () => void;
  onComplete: () => void;
}) {
  return (
    <SectionCard
      title={`${formatSaleNumber(item.saleNumber)} · ${item.customerName}`}
      action={
        <Badge tone={deliveryStatusTone(item.status)}>{deliveryStatusLabel(item.status)}</Badge>
      }
    >
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-muted">Telefon</dt>
          <dd className="break-words text-ink">{item.customerPhone ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Manzil</dt>
          <dd className="break-words text-ink">{item.address ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Sotuv sanasi</dt>
          <dd className="text-ink">{formatDate(item.saleDate)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Muddat</dt>
          <dd className="text-ink">
            {item.deliveryDueDate ? formatDate(item.deliveryDueDate) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Yakunlangan</dt>
          <dd className="text-ink">
            {item.deliveryDate ? formatDate(item.deliveryDate) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Shopir haqi</dt>
          <dd className="tabular-money text-ink" data-testid="delivery-fee">
            {formatMoney(item.fee)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Hisob holati</dt>
          <dd className="text-ink" data-testid="delivery-ledger-status">
            {ledgerStatusLabel(item.ledgerStatus)}
          </dd>
        </div>
        {item.hint ? (
          <div className="sm:col-span-2">
            <dt className="text-ink-muted">Eslatma</dt>
            <dd className="text-ink">{item.hint}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          to={ROUTES.saleDetail(item.saleId)}
          className="inline-flex justify-center rounded-input border border-line px-3 py-2.5 text-sm text-ink-soft hover:bg-surface-hover"
        >
          Sotuvni ko‘rish
        </Link>
        {item.canStart ? (
          <button
            type="button"
            disabled={busy}
            data-testid={`start-delivery-${item.saleId}`}
            onClick={onStart}
            className="inline-flex justify-center rounded-input border border-line px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-60"
          >
            Yetkazib berishni boshlash
          </button>
        ) : null}
        {item.canComplete ? (
          <button
            type="button"
            disabled={busy}
            data-testid={`complete-delivery-${item.saleId}`}
            onClick={onComplete}
            className="inline-flex items-center justify-center gap-2 rounded-input bg-success-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-success-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Yetkazib berishni yakunlash
          </button>
        ) : null}
      </div>
    </SectionCard>
  );
}

function PurchaseDeliveryCard({
  item,
  busy,
  onComplete,
}: {
  item: PurchaseDeliveryOpsItem;
  busy: boolean;
  onComplete: () => void;
}) {
  const statusLabel =
    item.status === 'COMPLETED'
      ? 'Yakunlangan'
      : item.status === 'CANCELLED'
        ? 'Bekor'
        : 'Kutilmoqda';
  return (
    <SectionCard
      title={`Kirim #${item.purchaseNumber} · ${item.supplierName}`}
      action={<Badge tone={item.status === 'COMPLETED' ? 'success' : 'neutral'}>{statusLabel}</Badge>}
    >
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-muted">Sana</dt>
          <dd className="text-ink">{formatDate(item.date)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Olib kelingan</dt>
          <dd className="text-ink">
            {item.deliveredAt ? formatDate(item.deliveredAt) : 'Hali olib kelinmagan'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Shopir haqi</dt>
          <dd className="tabular-money text-ink">{formatMoney(item.fee)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Hisob holati</dt>
          <dd className="text-ink">{ledgerStatusLabel(item.ledgerStatus)}</dd>
        </div>
        {item.hint ? (
          <div className="sm:col-span-2">
            <dt className="text-ink-muted">Eslatma</dt>
            <dd className="text-ink">{item.hint}</dd>
          </div>
        ) : null}
      </dl>
      {item.canComplete ? (
        <div className="mt-4">
          <button
            type="button"
            disabled={busy}
            data-testid={`complete-purchase-delivery-${item.id}`}
            onClick={onComplete}
            className="inline-flex w-full items-center justify-center gap-2 rounded-input bg-success-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-success-700 disabled:opacity-60 sm:w-auto"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Yakunlash
          </button>
        </div>
      ) : null}
    </SectionCard>
  );
}

function KpiMini({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-card border border-line bg-surface p-3 shadow-card">
      <p className="truncate text-xs text-ink-muted">{label}</p>
      <p
        className={
          emphasize
            ? 'tabular-money mt-1 truncate text-base font-semibold text-brand-800 sm:text-lg'
            : 'tabular-money mt-1 truncate text-base font-semibold text-ink sm:text-lg'
        }
      >
        {value}
      </p>
    </div>
  );
}
