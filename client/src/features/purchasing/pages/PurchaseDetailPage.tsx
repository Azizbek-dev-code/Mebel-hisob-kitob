import {
  PAYMENT_METHOD_LABELS,
  PurchaseStatus,
  UserRole,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { toInputDate, todayInputDate } from '@/features/expenses/utils/date';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { useWorkerLookup } from '@/features/sales/hooks/use-sales';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatDateTime, formatMoney } from '@/utils/format';
import {
  purchasePaymentStatusLabel,
  purchasePaymentStatusTone,
} from '@/utils/purchasing';

import { PaySupplierDialog } from '../components/PaySupplierDialog';
import {
  useCancelPurchase,
  usePurchaseDetail,
  useUpdatePurchaseDelivery,
} from '../hooks/use-purchasing';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message || 'Qayta urinib ko‘ring.';
  return 'Qayta urinib ko‘ring.';
}

function canManage(role: string | undefined): boolean {
  return role === UserRole.ADMIN || role === UserRole.PLATFORM_ADMIN;
}

export function PurchaseDetailPage() {
  const { id = '' } = useParams();
  const detail = usePurchaseDetail(id);
  const { data: currentUser } = useCurrentUser();
  const isAdmin = canManage(currentUser?.role);
  const cancelPurchase = useCancelPurchase(id);
  const updateDelivery = useUpdatePurchaseDelivery(id);
  const deliveryWorkers = useWorkerLookup('', WorkerResponsibility.DELIVERY);
  const purchase = detail.data;

  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [deliveredAt, setDeliveredAt] = useState(todayInputDate());
  const [deliveryDays, setDeliveryDays] = useState(0);
  const [driverId, setDriverId] = useState('');
  const [driverFee, setDriverFee] = useState(0);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  useEffect(() => {
    if (!purchase) return;
    setDeliveredAt(
      purchase.deliveredAt ? toInputDate(purchase.deliveredAt) : todayInputDate(),
    );
    setDeliveryDays(purchase.deliveryDays ?? 0);
    setDriverId(purchase.driverId ?? '');
    setDriverFee(purchase.driverFee ?? 0);
  }, [purchase]);

  const isCancelled = purchase?.status === PurchaseStatus.CANCELLED;
  const canPay =
    isAdmin && purchase && !isCancelled && purchase.remainingAmount > 0;
  const canCancel = isAdmin && purchase && !isCancelled;
  const canEditDelivery = isAdmin && purchase && !isCancelled;

  async function handleCancel(event: React.FormEvent) {
    event.preventDefault();
    setCancelError(null);
    if (!cancelConfirm) {
      setCancelError('Bekor qilishni tasdiqlang.');
      return;
    }
    if (!cancelReason.trim()) {
      setCancelError('Sabab majburiy.');
      return;
    }
    try {
      await cancelPurchase.mutateAsync({ reason: cancelReason.trim() });
      setCancelOpen(false);
      setCancelReason('');
      setCancelConfirm(false);
      setMessage('Kirim bekor qilindi.');
      void detail.refetch();
    } catch (error) {
      setCancelError(errorMessage(error));
    }
  }

  async function handleSaveDelivery(event: React.FormEvent) {
    event.preventDefault();
    setDeliveryError(null);
    if (!Number.isInteger(deliveryDays) || deliveryDays < 0) {
      setDeliveryError('Yetkazib berish muddati noto‘g‘ri.');
      return;
    }
    if (!Number.isInteger(driverFee) || driverFee < 0) {
      setDeliveryError('Shopir haqi noto‘g‘ri.');
      return;
    }
    try {
      await updateDelivery.mutateAsync({
        deliveredAt: deliveredAt || null,
        deliveryDays,
        driverId: driverId || null,
        driverFee,
      });
      setEditingDelivery(false);
      setMessage('Yetkazib berish ma’lumotlari saqlandi.');
      void detail.refetch();
    } catch (error) {
      setDeliveryError(errorMessage(error));
    }
  }

  return (
    <PageContainer className="space-y-6">
      <div data-testid="purchase-detail-page" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              to={ROUTES.purchases}
              className="mb-2 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
            >
              <ArrowLeft className="size-4" />
              Kirimlar
            </Link>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              {purchase ? `Kirim #${purchase.purchaseNumber}` : 'Kirim'}
            </h2>
            {purchase ? (
              <p className="mt-1 text-sm text-ink-muted">
                <Link
                  to={ROUTES.supplierDetail(purchase.supplierId)}
                  className="text-brand-700 hover:underline"
                >
                  {purchase.supplierName}
                </Link>
                {' · '}
                {formatDate(purchase.purchaseDate)}
              </p>
            ) : null}
            {purchase ? (
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge
                  tone={purchasePaymentStatusTone(purchase.paymentStatus, purchase.status)}
                >
                  {purchasePaymentStatusLabel(purchase.paymentStatus, purchase.status)}
                </Badge>
              </div>
            ) : null}
          </div>
          {purchase ? (
            <div className="flex flex-wrap gap-2">
              {canPay ? (
                <button
                  type="button"
                  onClick={() => setPayOpen(true)}
                  className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  data-testid="purchase-pay-open"
                >
                  To‘lash
                </button>
              ) : null}
              {canCancel ? (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="rounded-input border border-line px-3 py-2 text-sm text-danger-700 hover:bg-danger-50"
                  data-testid="purchase-cancel-open"
                >
                  Bekor qilish
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {message ? (
          <p className="rounded-input border border-line bg-surface-muted px-3 py-2 text-sm text-ink">
            {message}
          </p>
        ) : null}

        {detail.isError ? (
          <ErrorState
            title="Kirim topilmadi"
            message={errorMessage(detail.error)}
            onRetry={() => void detail.refetch()}
          />
        ) : detail.isLoading || !purchase ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <SectionCard title="Mahsulotlar">
                <p className="text-lg font-semibold">{formatMoney(purchase.totalCost)}</p>
              </SectionCard>
              <SectionCard title="Shopir haqi">
                <p className="text-lg font-semibold">{formatMoney(purchase.driverFee)}</p>
              </SectionCard>
              <SectionCard title="Qoldiq">
                <p className="text-lg font-semibold text-danger-700">
                  {formatMoney(purchase.remainingAmount)}
                </p>
              </SectionCard>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SectionCard title="To‘langan">
                <p className="text-lg font-semibold text-success-700">
                  {formatMoney(purchase.paidAmount)}
                </p>
              </SectionCard>
              <SectionCard title="Boshlang‘ich / jami to‘lov">
                <p className="text-sm text-ink-muted">
                  Qarz faqat mahsulotlar summasidan hisoblanadi.
                </p>
              </SectionCard>
            </div>

            {purchase.notes ? (
              <SectionCard title="Izoh">
                <p className="text-sm text-ink-soft">{purchase.notes}</p>
              </SectionCard>
            ) : null}

            <SectionCard
              title="Yetkazib berish"
              description="Yetkazuvchi va shopir — alohida tushunchalar"
              action={
                canEditDelivery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDelivery((v) => !v);
                      setDeliveryError(null);
                    }}
                    className="text-sm text-brand-700 hover:underline"
                    data-testid="purchase-edit-delivery"
                  >
                    {editingDelivery ? 'Bekor' : 'Tahrirlash'}
                  </button>
                ) : null
              }
            >
              {editingDelivery ? (
                <form onSubmit={(e) => void handleSaveDelivery(e)} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1.5 block font-medium text-ink">
                        Olib kelingan sana
                      </span>
                      <input
                        type="date"
                        className={fieldClass}
                        value={deliveredAt}
                        onChange={(e) => setDeliveredAt(e.target.value)}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1.5 block font-medium text-ink">
                        Necha kun ichida olib kelindi
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className={fieldClass}
                        value={deliveryDays}
                        onChange={(e) =>
                          setDeliveryDays(Number.parseInt(e.target.value, 10) || 0)
                        }
                      />
                    </label>
                    {(deliveryWorkers.data?.length ?? 0) > 0 ? (
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium text-ink">Shopir</span>
                        <select
                          className={fieldClass}
                          value={driverId}
                          onChange={(e) => setDriverId(e.target.value)}
                        >
                          <option value="">Tanlanmagan</option>
                          {(deliveryWorkers.data ?? []).map((worker) => (
                            <option key={worker.id} value={worker.id}>
                              {worker.fullName}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <MoneyField
                      label="Shopir haqi"
                      value={driverFee}
                      onChange={setDriverFee}
                    />
                  </div>
                  {deliveryError ? (
                    <p className="text-sm text-danger-700">{deliveryError}</p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={updateDelivery.isPending}
                    className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {updateDelivery.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
                  </button>
                </form>
              ) : (
                <dl className="space-y-2 text-sm" data-testid="purchase-delivery-section">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">Yetkazuvchi</dt>
                    <dd>
                      <Link
                        to={ROUTES.supplierDetail(purchase.supplierId)}
                        className="text-brand-700 hover:underline"
                      >
                        {purchase.supplierName}
                      </Link>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">Olib kelingan sana</dt>
                    <dd>
                      {purchase.deliveredAt ? formatDate(purchase.deliveredAt) : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">Yetkazib berish muddati</dt>
                    <dd>{purchase.deliveryDays} kun</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">Shopir</dt>
                    <dd>{purchase.driverName ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">Shopir haqi</dt>
                    <dd>{formatMoney(purchase.driverFee)}</dd>
                  </div>
                </dl>
              )}
            </SectionCard>

            {isCancelled ? (
              <SectionCard title="Bekor qilish ma’lumotlari">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">Sabab</dt>
                    <dd>{purchase.cancellationReason ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">Vaqt</dt>
                    <dd>
                      {purchase.cancelledAt ? formatDateTime(purchase.cancelledAt) : '—'}
                    </dd>
                  </div>
                </dl>
              </SectionCard>
            ) : null}

            <SectionCard title="Mahsulotlar" description="Kirim qatorlari">
              {purchase.items.length === 0 ? (
                <p className="text-sm text-ink-muted">Mahsulot yo‘q.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-line text-xs text-ink-muted">
                      <tr>
                        <th className="px-2 py-2 font-medium">Mahsulot</th>
                        <th className="px-2 py-2 font-medium">Miqdor</th>
                        <th className="px-2 py-2 font-medium">Narx</th>
                        <th className="px-2 py-2 font-medium">Jami</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchase.items.map((item) => (
                        <tr key={item.id} className="border-b border-line last:border-0">
                          <td className="px-2 py-2">{item.productName}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{item.quantity}</td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {formatMoney(item.unitCost)}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {formatMoney(item.lineTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="To‘lovlar" description="Yetkazuvchiga to‘lovlar">
              {purchase.payments.length === 0 ? (
                <p className="text-sm text-ink-muted">To‘lov yo‘q.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-line text-xs text-ink-muted">
                      <tr>
                        <th className="px-2 py-2 font-medium">Sana</th>
                        <th className="px-2 py-2 font-medium">Summa</th>
                        <th className="px-2 py-2 font-medium">Usul</th>
                        <th className="px-2 py-2 font-medium">Kim</th>
                        <th className="px-2 py-2 font-medium">Izoh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchase.payments.map((p) => (
                        <tr key={p.paymentId} className="border-b border-line last:border-0">
                          <td className="px-2 py-2 whitespace-nowrap">
                            {formatDateTime(p.paidAt)}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">{formatMoney(p.amount)}</td>
                          <td className="px-2 py-2">
                            {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                          </td>
                          <td className="px-2 py-2 text-ink-soft">{p.recordedByName ?? '—'}</td>
                          <td className="px-2 py-2 text-ink-soft">{p.note ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Ombor harakatlari" description="STOCK_IN / bekor qaytarish">
              {purchase.stockMovements.length === 0 ? (
                <p className="text-sm text-ink-muted">Harakat yo‘q.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-line text-xs text-ink-muted">
                      <tr>
                        <th className="px-2 py-2 font-medium">Mahsulot</th>
                        <th className="px-2 py-2 font-medium">Tur</th>
                        <th className="px-2 py-2 font-medium">Miqdor</th>
                        <th className="px-2 py-2 font-medium">Oldin</th>
                        <th className="px-2 py-2 font-medium">Keyin</th>
                        <th className="px-2 py-2 font-medium">Vaqt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchase.stockMovements.map((m) => (
                        <tr key={m.movementId} className="border-b border-line last:border-0">
                          <td className="px-2 py-2">{m.productName}</td>
                          <td className="px-2 py-2">{m.movementType}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{m.quantity}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{m.quantityBefore}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{m.quantityAfter}</td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {formatDateTime(m.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </>
        )}
      </div>

      {payOpen && purchase ? (
        <PaySupplierDialog
          purchase={purchase}
          onClose={() => setPayOpen(false)}
          onSuccess={(msg) => {
            setMessage(msg);
            void detail.refetch();
          }}
        />
      ) : null}

      {cancelOpen && purchase ? (
        <ModalPortal>
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-purchase-title"
          data-testid="purchase-cancel-dialog"
        >
          <form
            onSubmit={(e) => void handleCancel(e)}
            className="w-full max-w-md rounded-card border border-line bg-surface p-5 shadow-lg"
          >
            <h3 id="cancel-purchase-title" className="text-lg font-semibold text-ink">
              Kirim #{purchase.purchaseNumber} ni bekor qilasizmi?
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              Ombor qaytariladi, to‘lovlar tarixda qoladi. Amalni tasdiqlang.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-ink" htmlFor="cancel-reason">
                Sabab
              </label>
              <textarea
                id="cancel-reason"
                className={fieldClass}
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                data-testid="purchase-cancel-reason"
                required
              />
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={cancelConfirm}
                  onChange={(e) => setCancelConfirm(e.target.checked)}
                  data-testid="purchase-cancel-confirm"
                />
                Bekor qilishni tasdiqlayman
              </label>
            </div>

            {cancelError ? (
              <p className="mt-3 text-sm text-danger-700">{cancelError}</p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCancelOpen(false);
                  setCancelError(null);
                }}
                className="rounded-input border border-line px-3 py-2 text-sm hover:bg-surface-hover"
              >
                Yopish
              </button>
              <button
                type="submit"
                disabled={cancelPurchase.isPending}
                className="inline-flex items-center gap-2 rounded-input bg-danger-600 px-3 py-2 text-sm font-medium text-white hover:bg-danger-700 disabled:opacity-60"
                data-testid="purchase-cancel-submit"
              >
                {cancelPurchase.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
        </ModalPortal>
      ) : null}
    </PageContainer>
  );
}
