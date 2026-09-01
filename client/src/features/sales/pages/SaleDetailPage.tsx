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
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
import {
  useAddPayment,
  useCancelSale,
  useDeleteCancelledSale,
  useSale,
  useUpdateSale,
  useUpdateSaleDeliveryStatus,
} from '../hooks/use-sales';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export function SaleDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const saleQuery = useSale(id);
  const addPayment = useAddPayment(id ?? '');
  const cancelSale = useCancelSale(id ?? '');
  const deleteCancelledSale = useDeleteCancelledSale();
  const updateSale = useUpdateSale(id ?? '');
  const updateDeliveryStatus = useUpdateSaleDeliveryStatus();

  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [note, setNote] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [deliverySuccess, setDeliverySuccess] = useState<string | null>(null);
  const [deliveryCompleteOpen, setDeliveryCompleteOpen] = useState(false);
  const [installationError, setInstallationError] = useState<string | null>(null);
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
  const allowDelete = canCancelSale(currentUser) && isCancelled;
  const canEditFees = canManageStoreSettings(currentUser) && !isCancelled;
  const canEditWorkerPay =
    canManageStoreSettings(currentUser) && !isCancelled && !sale.workerCompensationLocked;

  const isAssignedShopir = Boolean(
    currentUser && sale.deliveryPerson && currentUser.id === sale.deliveryPerson.id,
  );
  const canManageDelivery =
    (canManageStoreSettings(currentUser) || isAssignedShopir) &&
    !isCancelled &&
    Boolean(sale.deliveryPerson) &&
    sale.deliveryStatus !== FulfilmentStatus.NOT_REQUIRED &&
    sale.deliveryStatus !== FulfilmentStatus.CANCELLED;

  const canStartDelivery =
    canManageDelivery &&
    (sale.deliveryStatus === FulfilmentStatus.PENDING ||
      sale.deliveryStatus === FulfilmentStatus.SCHEDULED);

  // Shopir must start first; admin may complete from pending/scheduled.
  const canCompleteDelivery =
    canManageDelivery &&
    sale.deliveryStatus !== FulfilmentStatus.COMPLETED &&
    (sale.deliveryStatus === FulfilmentStatus.IN_TRANSIT ||
      (Boolean(canManageStoreSettings(currentUser)) &&
        (sale.deliveryStatus === FulfilmentStatus.PENDING ||
          sale.deliveryStatus === FulfilmentStatus.SCHEDULED)));

  const canManageInstallation =
    canManageStoreSettings(currentUser) &&
    !isCancelled &&
    Boolean(sale.installationWorker) &&
    sale.installationStatus !== FulfilmentStatus.NOT_REQUIRED &&
    sale.installationStatus !== FulfilmentStatus.COMPLETED &&
    sale.installationStatus !== FulfilmentStatus.CANCELLED;

  const canStartInstallation =
    canManageInstallation &&
    (sale.installationStatus === FulfilmentStatus.PENDING ||
      sale.installationStatus === FulfilmentStatus.SCHEDULED);

  const canCompleteInstallation =
    canManageInstallation &&
    (sale.installationStatus === FulfilmentStatus.PENDING ||
      sale.installationStatus === FulfilmentStatus.SCHEDULED ||
      sale.installationStatus === FulfilmentStatus.IN_TRANSIT);

  const assemblerFee = sale.assemblerFee ?? sale.installationCost ?? 0;
  const installerFee = sale.installerFee ?? 0;
  const driverFee = sale.driverFee ?? sale.deliveryCost ?? 0;
  const sellerCommissionEstimate = sale.sellerCommissionEstimate ?? 0;
  const sellerRateLabel = sale.sellerCommissionRateLabel;
  const remainingAfterFees = estimateRemainingSaleProfit({
    grossProfit: sale.grossProfit,
    sellerCommissionEstimate,
    assemblerFee,
    installerFee,
    driverFee,
  });
  const hasExtraLegacyCosts = sale.sellerBonus > 0 || sale.otherCosts > 0;

  async function handleStartDelivery() {
    setDeliveryError(null);
    setDeliverySuccess(null);
    try {
      const result = await updateDeliveryStatus.mutateAsync({
        saleId: sale.id,
        body: { status: 'IN_TRANSIT' },
      });
      setDeliverySuccess(result.message || 'Yetkazib berish boshlandi');
    } catch (error) {
      setDeliveryError(mutationErrorMessage(error, 'Yetkazib berishni boshlab bo‘lmadi.'));
    }
  }

  async function handleConfirmCompleteDelivery() {
    setDeliveryError(null);
    setDeliverySuccess(null);
    try {
      const result = await updateDeliveryStatus.mutateAsync({
        saleId: sale.id,
        body: { status: 'COMPLETED' },
      });
      setDeliverySuccess(result.message);
      setDeliveryCompleteOpen(false);
    } catch (error) {
      setDeliveryError(mutationErrorMessage(error, 'Yetkazib berishni yakunlab bo‘lmadi.'));
    }
  }

  async function handleStartInstallation() {
    setInstallationError(null);
    try {
      await updateSale.mutateAsync({
        installationStatus: FulfilmentStatus.IN_TRANSIT,
      });
    } catch (error) {
      setInstallationError(mutationErrorMessage(error, 'O‘rnatishni boshlab bo‘lmadi.'));
    }
  }

  async function handleCompleteInstallation() {
    setInstallationError(null);
    try {
      await updateSale.mutateAsync({
        installationStatus: FulfilmentStatus.COMPLETED,
      });
    } catch (error) {
      setInstallationError(mutationErrorMessage(error, 'O‘rnatishni yakunlab bo‘lmadi.'));
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

  async function handleDeletePermanent() {
    if (!window.confirm(t('sales.deleteConfirm', { number: formatSaleNumber(sale.saleNumber) }))) {
      return;
    }
    try {
      await deleteCancelledSale.mutateAsync(sale.id);
      navigate(ROUTES.sales);
    } catch (error) {
      setCancelError(mutationErrorMessage(error, t('sales.deleteFailed')));
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
        assemblerFee: sale.assembler ? assemblerFeeDraft : 0,
        driverFee: sale.deliveryPerson ? driverFeeDraft : 0,
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
            aria-label={t('sales.backToSales')}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              {formatSaleNumber(sale.saleNumber)}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {t('sales.orderLabel')}: {formatDate(sale.saleDate)} · {customerDisplayName(sale.customer)}
              {sale.deliveryDueDate
                ? ` · ${t('sales.deliveryDueShort')}: ${formatDate(sale.deliveryDueDate)}`
                : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sale.status !== SaleStatus.CANCELLED ? (
            <Link
              to={ROUTES.saleEdit(sale.id)}
              className="inline-flex items-center rounded-input border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-hover"
              data-testid="sale-edit-link"
            >
              {t('sales.editSale')}
            </Link>
          ) : null}
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
              {t('sales.cancelSale')}
            </button>
          ) : null}
          {allowDelete ? (
            <button
              type="button"
              onClick={() => void handleDeletePermanent()}
              disabled={deleteCancelledSale.isPending}
              className="inline-flex items-center gap-1.5 rounded-input border border-danger-500/40 px-3 py-1.5 text-sm font-medium text-danger-700 hover:bg-danger-50 disabled:opacity-60"
              data-testid="sale-delete-permanent"
            >
              {deleteCancelledSale.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {t('common.delete')}
            </button>
          ) : null}
        </div>
      </div>

      {isCancelled ? (
        <SectionCard
          title={t('sales.cancellationDetails')}
          description={t('sales.cancellationHint')}
        >
          <dl className="space-y-2 text-sm" data-testid="sale-cancellation-details">
            <Row label={t('sales.cancellationReason')} value={sale.cancellationReason ?? '—'} />
            <Row label={t('sales.cancelledBy')} value={sale.cancelledBy?.fullName ?? '—'} />
            <Row
              label={t('sales.cancelledAt')}
              value={sale.cancelledAt ? formatDateTime(sale.cancelledAt) : '—'}
            />
          </dl>
          {cancelError ? (
            <p role="alert" className="mt-3 text-sm text-danger-600">
              {cancelError}
            </p>
          ) : null}
        </SectionCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title={t('sales.customer')}>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-ink-muted">{t('sales.firstName')}</dt>
              <dd className="font-medium text-ink">{customerDisplayName(sale.customer)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('sales.phone')}</dt>
              <dd className="text-ink">{sale.customer.phone}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('sales.address')}</dt>
              <dd className="text-ink">{sale.customer.address ?? '—'}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title={t('sales.totalSale')}>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-ink-muted">{t('sales.seller')}</dt>
              <dd className="text-ink">{sale.seller?.fullName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('sales.createdBy')}</dt>
              <dd className="text-ink">{sale.createdBy?.fullName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('sales.paymentType')}</dt>
              <dd className="text-ink">{paymentTypeLabel(sale.paymentType)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('common.notes')}</dt>
              <dd className="text-ink">{sale.notes ?? '—'}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title={t('sales.profit')}>
          <dl className="space-y-2 text-sm" data-testid="sale-profit-waterfall">
            <Row label={t('sales.salePrice')} value={formatMoney(sale.totalSalePrice)} strong />
            <Row label={`− ${t('sales.costPrice')}`} value={formatMoney(sale.totalCostPrice)} />
            <Row label={`= ${t('sales.grossProfit')}`} value={formatMoney(sale.grossProfit)} strong />
            <Row
              label={`− ${t('sales.seller')}`}
              value={formatMoney(sellerCommissionEstimate)}
            />
            <Row label={`− ${t('sales.assemblerFee')}`} value={formatMoney(assemblerFee)} />
            {installerFee > 0 ? (
              <Row
                label={`− ${t('sales.installerFee')}`}
                value={formatMoney(installerFee)}
              />
            ) : null}
            <Row label={`− ${t('sales.driverFee')}`} value={formatMoney(driverFee)} />
            <Row
              label={`= ${t('sales.netProfit')}`}
              value={formatMoney(remainingAfterFees)}
              strong
            />
            {hasExtraLegacyCosts ? (
              <p className="pt-1 text-xs text-ink-muted">
                {t('sales.netProfit')} ({formatMoney(sale.netProfit)})
              </p>
            ) : null}
            <Row label={t('sales.paid')} value={formatMoney(sale.paidAmount)} />
            <Row label={t('sales.remaining')} value={formatMoney(sale.remainingAmount)} strong />
          </dl>
        </SectionCard>
      </div>

      <SectionCard title={t('sales.peopleAndServices')}>
        <dl className="space-y-3 text-sm" data-testid="sale-people-services-section">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-ink-muted">{t('sales.seller')}</dt>
            <dd className="text-right text-ink" data-testid="sale-seller-commission">
              {sale.seller?.fullName ?? '—'}
              {' — '}
              {sellerRateLabel ?? '—'}
              {' — '}
              {formatMoney(sellerCommissionEstimate)}
              {sellerRateLabel ? (
                <div className="mt-1 text-xs font-normal text-ink-muted">
                  {t('sales.grossProfit')}: {formatMoney(sale.grossProfit)}
                </div>
              ) : null}
            </dd>
          </div>

          {canEditFees ? (
            <form onSubmit={handleSaveFees} className="space-y-3 border-t border-line pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {sale.assembler ? (
                  <div data-testid="sale-assembler-fee">
                    <MoneyField
                      label={`${t('sales.assembler')} · ${sale.assembler.fullName}`}
                      value={assemblerFeeDraft}
                      onChange={setAssemblerFeeDraft}
                    />
                  </div>
                ) : (
                  <Row label={t('sales.assembler')} value={t('sales.workerNotNeeded')} />
                )}
                {sale.deliveryPerson ? (
                  <div data-testid="sale-delivery-fee">
                    <MoneyField
                      label={`${t('sales.deliveryPerson')} · ${sale.deliveryPerson.fullName}`}
                      value={driverFeeDraft}
                      onChange={setDriverFeeDraft}
                    />
                  </div>
                ) : (
                  <Row label={t('sales.deliveryPerson')} value={t('sales.workerNotNeeded')} />
                )}
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
                {t('common.save')}
              </button>
            </form>
          ) : (
            <>
              <Row
                label={t('sales.assembler')}
                value={
                  sale.assembler
                    ? `${sale.assembler.fullName} · ${formatMoney(assemblerFee)}`
                    : t('sales.workerNotNeeded')
                }
              />
              <Row
                label={t('sales.installer')}
                value={
                  sale.installationWorker
                    ? `${sale.installationWorker.fullName} · ${formatMoney(installerFee)}`
                    : t('sales.workerNotNeeded')
                }
              />
              <Row
                label={t('sales.deliveryPerson')}
                value={
                  sale.deliveryPerson
                    ? `${sale.deliveryPerson.fullName} · ${formatMoney(driverFee)}`
                    : t('sales.workerNotNeeded')
                }
              />
              {sale.deliveryPerson && driverFee > 0 ? (
                <p className="mt-2 text-xs text-ink-muted" data-testid="sale-delivery-ledger-status">
                  {sale.deliveryStatus === FulfilmentStatus.COMPLETED
                    ? `Ledger: ✅ Hisobga tushdi · ${formatMoney(driverFee)}`
                    : sale.deliveryStatus === FulfilmentStatus.IN_TRANSIT
                      ? `Ledger: ⏳ Kutilmoqda · ${formatMoney(driverFee)} (yakunlanganda hisoblanadi)`
                      : `Ledger: ⏳ Kutilmoqda · ${formatMoney(driverFee)}`}
                </p>
              ) : null}
            </>
          )}
        </dl>
      </SectionCard>

      <SectionCard title={t('sales.furniture')}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs text-ink-muted uppercase">
              <tr>
                <th className="py-2 pr-4 font-medium">{t('sales.furniture')}</th>
                <th className="py-2 pr-4 font-medium">{t('sales.quantity')}</th>
                <th className="py-2 pr-4 font-medium text-right">{t('sales.costPrice')}</th>
                <th className="py-2 pr-4 font-medium text-right">{t('sales.salePrice')}</th>
                <th className="py-2 font-medium text-right">{t('sales.totals')}</th>
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
        <SectionCard title={t('sales.payment')}>
          {sale.payments.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('common.notFound')}</p>
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
                      {payment.isDeposit ? ` · ${t('sales.deposit')}` : ''}
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
              <p className="text-sm font-medium text-ink">{t('sales.payment')}</p>
              <MoneyField label={t('common.amount')} value={amount} onChange={setAmount} />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink">{t('sales.depositMethod')}</label>
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
                <label className="block text-sm font-medium text-ink">{t('common.notes')}</label>
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
                {t('common.save')}
              </button>
            </form>
          ) : null}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title={t('nav.assembly')}>
            <dl className="space-y-2 text-sm">
              <Row label={t('common.status')} value={assemblyStatusLabel(sale.assemblyStatus)} />
              <Row label={t('sales.assembler')} value={sale.assembler?.fullName ?? '—'} />
            </dl>
          </SectionCard>
          <SectionCard title={t('sales.installation')}>
            <dl className="space-y-2 text-sm">
              <Row
                label={t('common.status')}
                value={installationStatusLabel(sale.installationStatus)}
              />
              <Row
                label={t('sales.installer')}
                value={
                  sale.installationWorker
                    ? `${sale.installationWorker.fullName} · ${formatMoney(installerFee)}`
                    : t('sales.workerNotNeeded')
                }
              />
            </dl>
            {canManageInstallation ? (
              <div className="mt-4 space-y-2 border-t border-line pt-3">
                <p className="text-xs text-ink-muted">
                  Haq faqat yakunlanganda (COMPLETED) hisobga yoziladi.
                </p>
                {installationError ? (
                  <p role="alert" className="text-sm text-danger-600">
                    {installationError}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {canStartInstallation ? (
                    <button
                      type="button"
                      data-testid="start-installation"
                      disabled={updateSale.isPending}
                      onClick={() => void handleStartInstallation()}
                      className="inline-flex items-center gap-2 rounded-input border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-60"
                    >
                      {updateSale.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                      Boshlash
                    </button>
                  ) : null}
                  {canCompleteInstallation ? (
                    <button
                      type="button"
                      data-testid="complete-installation"
                      disabled={updateSale.isPending}
                      onClick={() => void handleCompleteInstallation()}
                      className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {updateSale.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                      Yakunlash
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </SectionCard>
          <SectionCard title={t('sales.delivery')}>
            <dl className="space-y-2 text-sm">
              <Row label={t('common.status')} value={deliveryStatusLabel(sale.deliveryStatus)} />
              <Row label={t('sales.deliveryPerson')} value={sale.deliveryPerson?.fullName ?? '—'} />
              <Row
                label={t('sales.deliveryDue')}
                value={sale.deliveryDueDate ? formatDate(sale.deliveryDueDate) : '—'}
              />
              <Row
                label={t('common.date')}
                value={sale.deliveryDate ? formatDate(sale.deliveryDate) : '—'}
              />
              <Row label={t('sales.address')} value={sale.deliveryAddress ?? '—'} />
            </dl>
            {canStartDelivery || canCompleteDelivery ? (
              <div className="mt-4 space-y-2 border-t border-line pt-3">
                <p className="text-xs text-ink-muted">{t('sales.completeDeliveryHint')}</p>
                {deliveryError ? (
                  <p role="alert" className="text-sm text-danger-600">
                    {deliveryError}
                  </p>
                ) : null}
                {deliverySuccess ? (
                  <p role="status" className="text-sm text-success-700">
                    {deliverySuccess}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {canStartDelivery ? (
                    <button
                      type="button"
                      data-testid="start-delivery"
                      disabled={updateDeliveryStatus.isPending}
                      onClick={() => void handleStartDelivery()}
                      className="rounded-input border border-line px-3 py-2 text-sm text-ink hover:bg-surface-hover disabled:opacity-60"
                    >
                      Boshlash
                    </button>
                  ) : null}
                  {canCompleteDelivery ? (
                    <button
                      type="button"
                      data-testid="complete-delivery"
                      disabled={updateDeliveryStatus.isPending}
                      onClick={() => setDeliveryCompleteOpen(true)}
                      className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {updateDeliveryStatus.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      {t('sales.completeDelivery')}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </SectionCard>
          {sale.installmentPlan ? (
            <SectionCard title={t('status.paymentType.INSTALLMENT')}>
              <dl className="space-y-2 text-sm">
                <Row label={t('sales.installmentMonths')} value={String(sale.installmentPlan.monthCount)} />
                <Row
                  label={t('common.amount')}
                  value={formatMoney(sale.installmentPlan.financedAmount)}
                />
                <Row
                  label={t('sales.remaining')}
                  value={formatMoney(sale.installmentPlan.remainingAmount)}
                />
                <Row label={t('common.status')} value={sale.installmentPlan.status} />
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
              {t('sales.cancelSale')} {formatSaleNumber(sale.saleNumber)}?
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
                {t('common.goBack')}
              </button>
              <button
                type="submit"
                disabled={cancelSale.isPending}
                className="inline-flex items-center gap-2 rounded-input bg-danger-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                data-testid="sale-cancel-submit"
              >
                {cancelSale.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {t('sales.cancelSale')}
              </button>
            </div>
          </form>
        </div>
        </ModalPortal>
      ) : null}

      <ConfirmDialog
        open={deliveryCompleteOpen}
        title={t('sales.completeDelivery')}
        message={
          <span>
            {formatSaleNumber(sale.saleNumber)} · {customerDisplayName(sale.customer)}.
            {driverFee > 0 ? ` Shopir haqi ${formatMoney(driverFee)} hisobga olinadi.` : ''}{' '}
            Davom etasizmi?
          </span>
        }
        confirmLabel={t('sales.completeDelivery')}
        cancelLabel={t('common.goBack')}
        busy={updateDeliveryStatus.isPending}
        onConfirm={() => void handleConfirmCompleteDelivery()}
        onCancel={() => setDeliveryCompleteOpen(false)}
      />
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
