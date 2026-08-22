import {
  estimateRemainingSaleProfit,
  FulfilmentStatus,
  PaymentMethod,
  SALE_WORKER_PAY_ROLE_LABELS,
  SALE_WORKER_PAY_SOURCE_LABELS,
  SaleStatus,
  type SaleWorkerCompensationDto,
  type SaleWorkerCompensationInput,
  type SaleWorkerPayRole,
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
import { mutationErrorMessage } from '@/lib/mutation-error';
import { canCancelSale, canManageStoreSettings } from '@/routes/navigation';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatDateTime, formatMoney } from '@/utils/format';
import {
  assemblyStatusLabel,
  assemblyStatusTone,
  customerDisplayName,
  deliveryStatusLabel,
  deliveryStatusTone,
  formatSaleNumber,
  installationStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
  paymentTypeLabel,
  saleStatusLabel,
  saleStatusTone,
} from '@/utils/sales';

import { MoneyField } from '../components/MoneyField';
import { useAddPayment, useCancelSale, useSale, useUpdateSale } from '../hooks/use-sales';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: currentUser } = useCurrentUser();
  const saleQuery = useSale(id);
  const addPayment = useAddPayment(id ?? '');
  const cancelSale = useCancelSale(id ?? '');
  const updateSale = useUpdateSale(id ?? '');

  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [note, setNote] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [payDraft, setPayDraft] = useState<Record<string, number>>({});
  const [payError, setPayError] = useState<string | null>(null);
  const [assemblerFeeDraft, setAssemblerFeeDraft] = useState(0);
  const [driverFeeDraft, setDriverFeeDraft] = useState(0);
  const [feeError, setFeeError] = useState<string | null>(null);

  const saleData = saleQuery.data;
  useEffect(() => {
    if (!saleData) return;
    const next: Record<string, number> = {};
    for (const row of saleData.workerCompensation ?? []) {
      next[row.id] = row.amount;
    }
    setPayDraft(next);
    setAssemblerFeeDraft(saleData.assemblerFee ?? saleData.installationCost ?? 0);
    setDriverFeeDraft(saleData.driverFee ?? saleData.deliveryCost ?? 0);
  }, [saleData]);

  if (saleQuery.isLoading) {
    return (
      <PageContainer className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </PageContainer>
    );
  }

  if (saleQuery.isError || !saleQuery.data) {
    return (
      <PageContainer>
        <ErrorState
          title="Sale not found"
          message={saleQuery.error instanceof Error ? saleQuery.error.message : 'Try again.'}
          onRetry={() => void saleQuery.refetch()}
        />
      </PageContainer>
    );
  }

  const sale = saleQuery.data;
  const isCancelled = sale.status === SaleStatus.CANCELLED;
  const allowCancel = canCancelSale(currentUser) && !isCancelled;
  const canEditFees = canManageStoreSettings(currentUser) && !isCancelled;
  const canEditWorkerPay =
    canManageStoreSettings(currentUser) && !isCancelled && !sale.workerCompensationLocked;
  const canCompleteDelivery =
    canManageStoreSettings(currentUser) &&
    !isCancelled &&
    Boolean(sale.deliveryPerson) &&
    sale.deliveryStatus !== FulfilmentStatus.NOT_REQUIRED &&
    sale.deliveryStatus !== FulfilmentStatus.COMPLETED &&
    sale.deliveryStatus !== FulfilmentStatus.CANCELLED;

  const assemblerFee = sale.assemblerFee ?? sale.installationCost ?? 0;
  const driverFee = sale.driverFee ?? sale.deliveryCost ?? 0;
  const sellerCommissionEstimate = sale.sellerCommissionEstimate ?? 0;
  const sellerRateLabel = sale.sellerCommissionRateLabel;
  const remainingAfterFees = estimateRemainingSaleProfit({
    grossProfit: sale.grossProfit,
    sellerCommissionEstimate,
    assemblerFee,
    driverFee,
  });
  const hasExtraLegacyCosts = sale.sellerBonus > 0 || sale.otherCosts > 0;

  async function handleCompleteDelivery() {
    setDeliveryError(null);
    try {
      await updateSale.mutateAsync({
        deliveryStatus: FulfilmentStatus.COMPLETED,
      });
    } catch (error) {
      setDeliveryError(mutationErrorMessage(error, 'Yetkazib berishni yakunlab bo‘lmadi.'));
    }
  }

  async function handleAddPayment(event: React.FormEvent) {
    event.preventDefault();
    setPaymentError(null);
    try {
      await addPayment.mutateAsync({
        amount,
        method,
        note: note.trim() || undefined,
      });
      setAmount(0);
      setNote('');
    } catch (error) {
      setPaymentError(mutationErrorMessage(error, 'To‘lov saqlanmadi.'));
    }
  }

  async function handleCancelSale(event: React.FormEvent) {
    event.preventDefault();
    setCancelError(null);
    if (!cancelConfirm) {
      setCancelError('Confirm cancellation before continuing.');
      return;
    }
    try {
      await cancelSale.mutateAsync({ reason: cancelReason.trim() });
      setCancelOpen(false);
      setCancelReason('');
      setCancelConfirm(false);
    } catch (error) {
      setCancelError(mutationErrorMessage(error, 'Sotuvni bekor qilib bo‘lmadi.'));
    }
  }

  async function handleSaveWorkerPay(event: React.FormEvent) {
    event.preventDefault();
    setPayError(null);
    const rows: SaleWorkerCompensationInput[] = (sale.workerCompensation ?? []).map((row) => ({
      role: row.role,
      workerId: row.workerId,
      amount: payDraft[row.id] ?? row.amount,
    }));
    try {
      await updateSale.mutateAsync({ workerCompensation: rows });
    } catch (error) {
      setPayError(mutationErrorMessage(error, 'Ishchi haqqi saqlanmadi.'));
    }
  }

  async function handleSaveFees(event: React.FormEvent) {
    event.preventDefault();
    setFeeError(null);
    try {
      await updateSale.mutateAsync({
        assemblerFee: assemblerFeeDraft,
        driverFee: driverFeeDraft,
      });
    } catch (error) {
      setFeeError(mutationErrorMessage(error, 'Xizmat haqlari saqlanmadi.'));
    }
  }

  const workerCompensation: SaleWorkerCompensationDto[] = sale.workerCompensation ?? [];

  return (
    <PageContainer className="space-y-6" data-testid="sale-detail-page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            to={ROUTES.sales}
            className="mt-1 rounded-input border border-line p-2 text-ink-muted hover:bg-surface-hover hover:text-ink"
            aria-label="Back to sales"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              {formatSaleNumber(sale.saleNumber)}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {formatDate(sale.saleDate)} · {customerDisplayName(sale.customer)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={saleStatusTone(sale.status)}>{saleStatusLabel(sale.status)}</Badge>
          <Badge tone={paymentStatusTone(sale.paymentStatus)}>
            {paymentStatusLabel(sale.paymentStatus)}
          </Badge>
          <Badge tone={assemblyStatusTone(sale.assemblyStatus)}>
            {assemblyStatusLabel(sale.assemblyStatus)}
          </Badge>
          <Badge tone={deliveryStatusTone(sale.deliveryStatus)}>
            {deliveryStatusLabel(sale.deliveryStatus)}
          </Badge>
          {allowCancel ? (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="rounded-input border border-danger-500/40 px-3 py-1.5 text-sm font-medium text-danger-700 hover:bg-danger-50"
              data-testid="sale-cancel-open"
            >
              Cancel sale
            </button>
          ) : null}
        </div>
      </div>

      {isCancelled ? (
        <SectionCard
          title="Cancellation details"
          description="This sale is voided and excluded from revenue, debt and compensation."
        >
          <dl className="space-y-2 text-sm" data-testid="sale-cancellation-details">
            <Row label="Reason" value={sale.cancellationReason ?? '—'} />
            <Row label="Cancelled by" value={sale.cancelledBy?.fullName ?? '—'} />
            <Row
              label="Cancelled at"
              value={sale.cancelledAt ? formatDateTime(sale.cancelledAt) : '—'}
            />
          </dl>
        </SectionCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Customer">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-ink-muted">Name</dt>
              <dd className="font-medium text-ink">{customerDisplayName(sale.customer)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Phone</dt>
              <dd className="text-ink">{sale.customer.phone}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Address</dt>
              <dd className="text-ink">{sale.customer.address ?? '—'}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Sale">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-ink-muted">Seller</dt>
              <dd className="text-ink">{sale.seller?.fullName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Created by</dt>
              <dd className="text-ink">{sale.createdBy?.fullName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Payment type</dt>
              <dd className="text-ink">{paymentTypeLabel(sale.paymentType)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Notes</dt>
              <dd className="text-ink">{sale.notes ?? '—'}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Foyda">
          <dl className="space-y-2 text-sm" data-testid="sale-profit-waterfall">
            <Row label="Sotuv narxi" value={formatMoney(sale.totalSalePrice)} strong />
            <Row label="− Tannarx" value={formatMoney(sale.totalCostPrice)} />
            <Row label="= Yalpi foyda" value={formatMoney(sale.grossProfit)} strong />
            <Row
              label="− Sotuvchi foizi (estimate)"
              value={formatMoney(sellerCommissionEstimate)}
            />
            <Row label="− Usta haqqi" value={formatMoney(assemblerFee)} />
            <Row label="− Shopir haqqi" value={formatMoney(driverFee)} />
            <Row
              label="= Sotuvdan qolgan foyda"
              value={formatMoney(remainingAfterFees)}
              strong
            />
            {hasExtraLegacyCosts ? (
              <p className="pt-1 text-xs text-ink-muted">
                Saqlangan netProfit ({formatMoney(sale.netProfit)}) shuningdek sellerBonus /
                otherCosts ni hisobga oladi.
              </p>
            ) : null}
            <Row label="To&apos;langan" value={formatMoney(sale.paidAmount)} />
            <Row label="Qoldiq" value={formatMoney(sale.remainingAmount)} strong />
          </dl>
        </SectionCard>
      </div>

      <SectionCard
        title="Sotuvchilar va xizmat haqlari"
        description="Sotuvchi foizi — qoida bo‘yicha taxmin; usta/shopir — sotuvdagi qo‘lda summalar."
      >
        <dl className="space-y-3 text-sm" data-testid="sale-service-fees-section">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-ink-muted">Sotuvchi</dt>
            <dd className="text-right text-ink" data-testid="sale-seller-commission">
              {sale.seller?.fullName ?? '—'}
              {' — '}
              {sellerRateLabel ?? 'qoida yo‘q'}
              {' — '}
              {formatMoney(sellerCommissionEstimate)}
            </dd>
          </div>

          {canEditFees ? (
            <form onSubmit={handleSaveFees} className="space-y-3 border-t border-line pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <MoneyField
                  label="Usta haqqi"
                  value={assemblerFeeDraft}
                  onChange={setAssemblerFeeDraft}
                />
                <MoneyField
                  label="Shopir haqqi"
                  value={driverFeeDraft}
                  onChange={setDriverFeeDraft}
                />
              </div>
              {feeError ? (
                <p role="alert" className="text-sm text-danger-600">
                  {feeError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={updateSale.isPending}
                className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                data-testid="sale-fees-save"
              >
                {updateSale.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Saqlash
              </button>
            </form>
          ) : (
            <>
              <Row label="Usta" value={formatMoney(assemblerFee)} />
              <Row label="Shopir" value={formatMoney(driverFee)} />
            </>
          )}
        </dl>
      </SectionCard>

      <SectionCard title="Furniture">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs text-ink-muted uppercase">
              <tr>
                <th className="py-2 pr-4 font-medium">Product</th>
                <th className="py-2 pr-4 font-medium">Qty</th>
                <th className="py-2 pr-4 font-medium text-right">Cost</th>
                <th className="py-2 pr-4 font-medium text-right">Sale</th>
                <th className="py-2 font-medium text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-ink">{item.productName}</p>
                    {item.productSku ? (
                      <p className="text-xs text-ink-muted">{item.productSku}</p>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">{item.quantity}</td>
                  <td className="py-3 pr-4 text-right text-ink-soft">
                    {formatMoney(item.unitCostPrice)}
                  </td>
                  <td className="py-3 pr-4 text-right text-ink-soft">
                    {formatMoney(item.unitSalePrice)}
                  </td>
                  <td className="py-3 text-right font-medium text-ink">
                    {formatMoney(item.lineSaleTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {workerCompensation.length > 0 ? (
        <SectionCard
          title="Ish haqlari (qo‘lda)"
          description="Ilgari kiritilgan MANUAL qatorlar. Oddiy usta/shopir maydonlari bilan aralashtirmang."
        >
          {sale.workerCompensationLocked ? (
            <p
              className="mb-3 rounded-input border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              data-testid="worker-pay-locked"
            >
              Ish haqlari settled — amounts are locked and cannot be edited.
            </p>
          ) : null}

          <form
            onSubmit={handleSaveWorkerPay}
            className="space-y-3"
            data-testid="worker-compensation-table"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs text-ink-muted uppercase">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Worker</th>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    <th className="py-2 pr-4 font-medium text-right">Amount</th>
                    <th className="py-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {workerCompensation.map((row) => (
                    <tr key={row.id} className="border-t border-line">
                      <td className="py-3 pr-4 font-medium text-ink">{row.worker.fullName}</td>
                      <td className="py-3 pr-4 text-ink-soft">
                        {SALE_WORKER_PAY_ROLE_LABELS[row.role as SaleWorkerPayRole] ?? row.role}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {canEditWorkerPay ? (
                          <MoneyField
                            label=""
                            value={payDraft[row.id] ?? row.amount}
                            onChange={(value) =>
                              setPayDraft((prev) => ({ ...prev, [row.id]: value }))
                            }
                          />
                        ) : (
                          <span className="font-medium text-ink">{formatMoney(row.amount)}</span>
                        )}
                      </td>
                      <td className="py-3 text-ink-soft">
                        {SALE_WORKER_PAY_SOURCE_LABELS[row.source] ?? row.source}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {payError ? (
              <p role="alert" className="text-sm text-danger-600">
                {payError}
              </p>
            ) : null}
            {canEditWorkerPay ? (
              <button
                type="submit"
                disabled={updateSale.isPending}
                className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                data-testid="worker-pay-save"
              >
                {updateSale.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Save worker pay
              </button>
            ) : null}
          </form>
        </SectionCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Payment history">
          {sale.payments.length === 0 ? (
            <p className="text-sm text-ink-muted">No payments recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {sale.payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{formatMoney(payment.amount)}</p>
                    <p className="text-xs text-ink-muted">
                      {formatDateTime(payment.paidAt)} · {paymentMethodLabel(payment.method)}
                      {payment.isDeposit ? ' · Deposit' : ''}
                    </p>
                    {payment.note ? <p className="mt-1 text-xs text-ink-soft">{payment.note}</p> : null}
                  </div>
                  <p className="text-xs text-ink-muted">{payment.createdBy?.fullName ?? '—'}</p>
                </li>
              ))}
            </ul>
          )}

          {!isCancelled && sale.remainingAmount > 0 ? (
            <form onSubmit={handleAddPayment} className="mt-5 space-y-3 border-t border-line pt-4">
              <p className="text-sm font-medium text-ink">Add payment</p>
              <MoneyField label="Amount" value={amount} onChange={setAmount} />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink">Method</label>
                <select
                  className={fieldClass}
                  value={method}
                  onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                >
                  {Object.values(PaymentMethod).map((value) => (
                    <option key={value} value={value}>
                      {paymentMethodLabel(value)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink">Note</label>
                <input
                  className={fieldClass}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
              {paymentError ? (
                <p role="alert" className="text-sm text-danger-600">
                  {paymentError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={addPayment.isPending || amount <= 0}
                className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {addPayment.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Record payment
              </button>
            </form>
          ) : null}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Assembly">
            <dl className="space-y-2 text-sm">
              <Row label="Status" value={assemblyStatusLabel(sale.assemblyStatus)} />
              <Row label="Worker" value={sale.assembler?.fullName ?? '—'} />
              <Row label="Installation" value={installationStatusLabel(sale.installationStatus)} />
            </dl>
          </SectionCard>
          <SectionCard title="Delivery">
            <dl className="space-y-2 text-sm">
              <Row label="Status" value={deliveryStatusLabel(sale.deliveryStatus)} />
              <Row label="Worker" value={sale.deliveryPerson?.fullName ?? '—'} />
              <Row
                label="Date"
                value={sale.deliveryDate ? formatDate(sale.deliveryDate) : '—'}
              />
              <Row label="Address" value={sale.deliveryAddress ?? '—'} />
            </dl>
            {canCompleteDelivery ? (
              <div className="mt-4 space-y-2 border-t border-line pt-3">
                <p className="text-xs text-ink-muted">
                  Mark delivery complete so FIXED_PER_DELIVERY compensation can include this sale.
                </p>
                {deliveryError ? (
                  <p role="alert" className="text-sm text-danger-600">
                    {deliveryError}
                  </p>
                ) : null}
                <button
                  type="button"
                  data-testid="complete-delivery"
                  disabled={updateSale.isPending}
                  onClick={() => void handleCompleteDelivery()}
                  className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {updateSale.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Complete delivery
                </button>
              </div>
            ) : null}
          </SectionCard>
          {sale.installmentPlan ? (
            <SectionCard title="Installment plan">
              <dl className="space-y-2 text-sm">
                <Row label="Months" value={String(sale.installmentPlan.monthCount)} />
                <Row
                  label="Financed"
                  value={formatMoney(sale.installmentPlan.financedAmount)}
                />
                <Row
                  label="Remaining"
                  value={formatMoney(sale.installmentPlan.remainingAmount)}
                />
                <Row label="Status" value={sale.installmentPlan.status} />
              </dl>
            </SectionCard>
          ) : null}
        </div>
      </div>

      {cancelOpen ? (
        <ModalPortal>
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-sale-title"
          data-testid="sale-cancel-dialog"
        >
          <form
            onSubmit={handleCancelSale}
            className="w-full max-w-md space-y-4 rounded-panel border border-line bg-surface p-4 shadow-card"
          >
            <h3 id="cancel-sale-title" className="text-lg font-semibold text-ink">
              Cancel sale {formatSaleNumber(sale.saleNumber)}?
            </h3>
            <p className="text-sm text-ink-muted">
              The sale stays in history as Cancelled. It will leave revenue, customer debt and
              compensation previews. Payment rows are kept for audit — this does not create a
              refund.
            </p>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink" htmlFor="cancel-reason">
                Cancellation reason
              </label>
              <textarea
                id="cancel-reason"
                className={fieldClass}
                rows={3}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                data-testid="sale-cancel-reason"
                required
                minLength={3}
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={cancelConfirm}
                onChange={(event) => setCancelConfirm(event.target.checked)}
                className="mt-1"
                data-testid="sale-cancel-confirm"
              />
              I confirm this sale should be voided.
            </label>
            {cancelError ? (
              <p role="alert" className="text-sm text-danger-700">
                {cancelError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCancelOpen(false);
                  setCancelError(null);
                }}
                className="rounded-input border border-line px-3 py-2 text-sm"
              >
                Keep sale
              </button>
              <button
                type="submit"
                disabled={cancelSale.isPending}
                className="inline-flex items-center gap-2 rounded-input bg-danger-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                data-testid="sale-cancel-submit"
              >
                {cancelSale.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Cancel sale
              </button>
            </div>
          </form>
        </div>
        </ModalPortal>
      ) : null}
    </PageContainer>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`text-right ${strong ? 'font-semibold text-ink' : 'text-ink'}`}>{value}</dd>
    </div>
  );
}
