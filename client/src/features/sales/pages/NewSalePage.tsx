import {
  calculateSaleTotals,
  PaymentMethod,
  PaymentType,
  WorkerResponsibility,
  type CreateSaleRequest,
} from '@furniture-erp/shared';
import { ArrowLeft, Loader2, Plus, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { PageContainer } from '@/components/layout/PageContainer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SectionCard } from '@/components/ui/SectionCard';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { useSubscription } from '@/features/subscription/subscription-context';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { canManageInventory } from '@/routes/navigation';
import { ROUTES } from '@/routes/paths';
import { formatMoney } from '@/utils/format';
import { paymentMethodLabel, paymentTypeLabel } from '@/utils/sales';

import { MoneyField } from '../components/MoneyField';
import {
  SaleLineItemsEditor,
  type SaleLineDraft,
} from '../components/SaleLineItemsEditor';
import { SearchSelect, type SearchSelectOption } from '../components/SearchSelect';
import { WorkerFeeRow } from '../components/WorkerFeeRow';
import {
  useCreateCustomer,
  useCreateSale,
  useCustomerLookup,
  useProductLookup,
  useWorkerLookup,
} from '../hooks/use-sales';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export function NewSalePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const { canWrite, openGate } = useSubscription();
  const createSale = useCreateSale();
  const createCustomer = useCreateCustomer();
  const canQuickCreateProduct = canManageInventory(currentUser.data);

  const [customerQuery, setCustomerQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [customer, setCustomer] = useState<SearchSelectOption | null>(null);
  const [lines, setLines] = useState<SaleLineDraft[]>([]);
  const [sellerId, setSellerId] = useState('');
  const [assemblerId, setAssemblerId] = useState('');
  const [installationWorkerId, setInstallationWorkerId] = useState('');
  const [deliveryPersonId, setDeliveryPersonId] = useState('');

  const [discountAmount, setDiscountAmount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.DEPOSIT);
  const [installmentMonthCount, setInstallmentMonthCount] = useState(3);
  const [assemblerFee, setAssemblerFee] = useState(0);
  const [installerFee, setInstallerFee] = useState(0);
  const [driverFee, setDriverFee] = useState(0);

  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [deliveryDueDate, setDeliveryDueDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [confirmMissingCost, setConfirmMissingCost] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const customers = useCustomerLookup(customerQuery);
  const products = useProductLookup(productQuery);
  const sellers = useWorkerLookup('', WorkerResponsibility.SELLER);
  const assemblers = useWorkerLookup('', WorkerResponsibility.ASSEMBLER);
  const installers = useWorkerLookup('', WorkerResponsibility.INSTALLER);
  const deliveryWorkers = useWorkerLookup('', WorkerResponsibility.DELIVERY);

  const effectiveSellerId = sellerId || currentUser.data?.id || '';
  const deliveryRequired = Boolean(deliveryPersonId);
  const effectiveAssemblerFee = assemblerId ? assemblerFee : 0;
  const effectiveInstallerFee = installationWorkerId ? installerFee : 0;
  const effectiveDriverFee = deliveryPersonId ? driverFee : 0;

  const totals = useMemo(
    () =>
      calculateSaleTotals({
        items: lines.map((line) => ({
          quantity: line.quantity,
          unitCostPrice: line.unitCostPrice,
          unitSalePrice: line.unitSalePrice,
        })),
        discountAmount,
        depositAmount,
        costs: {
          installationCost: effectiveAssemblerFee,
          installerFee: effectiveInstallerFee,
          deliveryCost: effectiveDriverFee,
        },
      }),
    [
      lines,
      discountAmount,
      depositAmount,
      effectiveAssemblerFee,
      effectiveInstallerFee,
      effectiveDriverFee,
    ],
  );

  const customerOptions: SearchSelectOption[] = (customers.data ?? []).map((item) => ({
    id: item.id,
    label: `${item.firstName} ${item.lastName}`,
    description: item.phone ?? undefined,
  }));

  const productOptions: SearchSelectOption[] = (products.data ?? []).map((item) => ({
    id: item.id,
    label: item.name,
    description: item.sku ?? undefined,
  }));

  async function handleCreateCustomer() {
    setFormError(null);
    try {
      const created = await createCustomer.mutateAsync({
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        phone: newPhone.trim(),
        address: newAddress.trim() || undefined,
      });
      setCustomer({
        id: created.id,
        label: `${created.firstName} ${created.lastName}`,
        description: created.phone ?? undefined,
      });
      setShowNewCustomer(false);
      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');
      setNewAddress('');
    } catch (error) {
      setFormError(mutationErrorMessage(error, t('sales.customerSaveFailed')));
    }
  }

  async function submitSale() {
    if (!customer || lines.length === 0) {
      setFormError(t('sales.selectCustomerProduct'));
      return;
    }
    if (!effectiveSellerId) {
      setFormError(t('sales.selectSeller'));
      return;
    }
    if (deliveryRequired && !deliveryDueDate) {
      setFormError(t('sales.selectDeliveryDue'));
      return;
    }

    const body: CreateSaleRequest = {
      customerId: customer.id,
      sellerId: effectiveSellerId,
      saleDate: saleDate || undefined,
      items: lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitCostPrice: line.unitCostPrice,
        unitSalePrice: line.unitSalePrice,
      })),
      discountAmount,
      paymentType,
      depositAmount,
      depositMethod,
      installmentMonthCount:
        paymentType === PaymentType.INSTALLMENT ? installmentMonthCount : undefined,
      assemblerFee: effectiveAssemblerFee,
      installerFee: effectiveInstallerFee,
      driverFee: effectiveDriverFee,
      assemblerId: assemblerId || undefined,
      installationWorkerId: installationWorkerId || undefined,
      installationRequired: Boolean(assemblerId || installationWorkerId),
      deliveryRequired,
      deliveryPersonId: deliveryPersonId || undefined,
      deliveryDueDate: deliveryRequired && deliveryDueDate ? deliveryDueDate : undefined,
      deliveryAddress: deliveryRequired ? deliveryAddress || undefined : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const sale = await createSale.mutateAsync(body);
      navigate(ROUTES.saleDetail(sale.id));
    } catch (error) {
      setFormError(mutationErrorMessage(error));
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite) {
      openGate();
      return;
    }
    setFormError(null);

    if (!customer || lines.length === 0) {
      setFormError(t('sales.selectCustomerProduct'));
      return;
    }
    if (!effectiveSellerId) {
      setFormError(t('sales.selectSeller'));
      return;
    }
    if (deliveryRequired && !deliveryDueDate) {
      setFormError(t('sales.selectDeliveryDue'));
      return;
    }

    if (lines.some((line) => line.unitCostPrice <= 0) && !confirmMissingCost) {
      setConfirmMissingCost(true);
      return;
    }

    await submitSale();
  }

  return (
    <PageContainer className="space-y-6">
      <div className="flex items-start gap-3">
        <Link
          to={ROUTES.sales}
          className="mt-1 rounded-input border border-line p-2 text-ink-muted hover:bg-surface-hover hover:text-ink"
          aria-label={t('sales.backToSales')}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('sales.new')}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t('sales.newHint')}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SectionCard
            title={t('sales.customer')}
            action={
              <button
                type="button"
                onClick={() => setShowNewCustomer((value) => !value)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700"
              >
                <UserPlus className="size-4" />
                {t('sales.newCustomer')}
              </button>
            }
          >
            <SearchSelect
              label={t('sales.existingCustomer')}
              placeholder={t('sales.searchNamePhone')}
              value={customer}
              options={customerOptions}
              isLoading={customers.isFetching}
              query={customerQuery}
              onQueryChange={setCustomerQuery}
              onChange={setCustomer}
              emptyMessage={t('sales.customerNotFound')}
            />

            {showNewCustomer ? (
              <div className="mt-4 grid gap-3 rounded-card border border-line bg-surface-muted p-4 sm:grid-cols-2">
                <input
                  className={fieldClass}
                  placeholder={t('sales.firstName')}
                  value={newFirstName}
                  onChange={(event) => setNewFirstName(event.target.value)}
                />
                <input
                  className={fieldClass}
                  placeholder={t('sales.lastName')}
                  value={newLastName}
                  onChange={(event) => setNewLastName(event.target.value)}
                />
                <input
                  className={fieldClass}
                  placeholder={t('sales.phone')}
                  value={newPhone}
                  onChange={(event) => setNewPhone(event.target.value)}
                />
                <input
                  className={fieldClass}
                  placeholder={`${t('sales.address')} (${t('common.optional')})`}
                  value={newAddress}
                  onChange={(event) => setNewAddress(event.target.value)}
                />
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => void handleCreateCustomer()}
                    disabled={createCustomer.isPending}
                    className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {createCustomer.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    {t('common.saveAndSelect')}
                  </button>
                </div>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title={t('sales.furniture')}>
            <SaleLineItemsEditor
              lines={lines}
              onChange={(next) => {
                setLines(next);
                setFormError(null);
              }}
              productOptions={productOptions}
              productQuery={productQuery}
              onProductQueryChange={setProductQuery}
              productsLoading={products.isFetching}
              resolveProductPrices={(productId) => {
                const match = products.data?.find((item) => item.id === productId);
                if (!match) return null;
                return {
                  costPrice: match.costPrice,
                  defaultSalePrice: match.defaultSalePrice,
                };
              }}
              showQuickCreate={canQuickCreateProduct}
              showNewProduct={showNewProduct}
              onToggleNewProduct={() => setShowNewProduct((value) => !value)}
              onCancelNewProduct={() => setShowNewProduct(false)}
              emptyMessage={t('sales.productNotFound')}
            />
          </SectionCard>

          <SectionCard title={t('sales.payment')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink">{t('sales.paymentType')}</label>
                <select
                  className={fieldClass}
                  value={paymentType}
                  onChange={(event) => setPaymentType(event.target.value as PaymentType)}
                >
                  {Object.values(PaymentType).map((type) => (
                    <option key={type} value={type}>
                      {paymentTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              <MoneyField
                label={t('sales.deposit')}
                value={depositAmount}
                onChange={setDepositAmount}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink">
                  {t('sales.depositMethod')}
                </label>
                <select
                  className={fieldClass}
                  value={depositMethod}
                  onChange={(event) => setDepositMethod(event.target.value as PaymentMethod)}
                >
                  {Object.values(PaymentMethod).map((method) => (
                    <option key={method} value={method}>
                      {paymentMethodLabel(method)}
                    </option>
                  ))}
                </select>
              </div>

              {paymentType === PaymentType.INSTALLMENT ? (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-ink">
                    {t('sales.installmentMonths')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    className={fieldClass}
                    value={installmentMonthCount}
                    onChange={(event) =>
                      setInstallmentMonthCount(Math.max(1, Number(event.target.value) || 1))
                    }
                  />
                </div>
              ) : null}

              <MoneyField
                label={t('sales.discount')}
                value={discountAmount}
                onChange={setDiscountAmount}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink">{t('sales.orderDate')}</label>
                <input
                  type="date"
                  className={fieldClass}
                  value={saleDate}
                  onChange={(event) => setSaleDate(event.target.value)}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t('sales.peopleAndServices')}>
            <div className="grid gap-3 sm:grid-cols-2" data-testid="sale-people-services">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-sm font-medium text-ink">{t('sales.seller')}</label>
                <select
                  className={fieldClass}
                  value={effectiveSellerId}
                  onChange={(event) => setSellerId(event.target.value)}
                  data-testid="sale-seller-select"
                >
                  {(sellers.data ?? []).map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <WorkerFeeRow
                workerLabel={t('sales.assembler')}
                feeLabel={t('sales.assemblerFee')}
                workerId={assemblerId}
                onWorkerChange={(id) => {
                  setAssemblerId(id);
                  if (!id) setAssemblerFee(0);
                }}
                workers={assemblers.data ?? []}
                noneLabel={t('sales.workerNotNeeded')}
                fee={assemblerFee}
                onFeeChange={setAssemblerFee}
                selectTestId="sale-assembler-select"
                feeTestId="sale-assembler-fee"
              />

              <WorkerFeeRow
                workerLabel={t('sales.installer')}
                feeLabel={t('sales.installerFee')}
                workerId={installationWorkerId}
                onWorkerChange={(id) => {
                  setInstallationWorkerId(id);
                  if (!id) setInstallerFee(0);
                }}
                workers={installers.data ?? []}
                noneLabel={t('sales.workerNotNeeded')}
                fee={installerFee}
                onFeeChange={setInstallerFee}
                selectTestId="sale-installer-select"
                feeTestId="sale-installer-fee"
              />

              <WorkerFeeRow
                workerLabel={t('sales.deliveryPerson')}
                feeLabel={t('sales.driverFee')}
                workerId={deliveryPersonId}
                onWorkerChange={(id) => {
                  setDeliveryPersonId(id);
                  if (!id) {
                    setDriverFee(0);
                    setDeliveryDueDate('');
                    setDeliveryAddress('');
                  }
                }}
                workers={deliveryWorkers.data ?? []}
                noneLabel={t('sales.workerNotNeeded')}
                fee={driverFee}
                onFeeChange={setDriverFee}
                selectTestId="sale-delivery-select"
                feeTestId="sale-delivery-fee"
                extra={
                  <>
                    {deliveryPersonId && driverFee > 0 ? (
                      <p className="text-xs text-ink-muted" data-testid="sale-delivery-fee-hint">
                        {formatMoney(driverFee)} — {t('sales.completeDeliveryHint')}
                      </p>
                    ) : null}
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-ink">
                        {t('sales.deliveryDueRequired')}
                      </label>
                      <input
                        type="date"
                        className={fieldClass}
                        value={deliveryDueDate}
                        onChange={(event) => setDeliveryDueDate(event.target.value)}
                        data-testid="sale-delivery-due-date"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-ink">
                        {t('sales.deliveryAddress')}
                      </label>
                      <input
                        className={fieldClass}
                        value={deliveryAddress}
                        onChange={(event) => setDeliveryAddress(event.target.value)}
                        placeholder={t('sales.address')}
                      />
                    </div>
                  </>
                }
              />

              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-sm font-medium text-ink">{t('common.notes')}</label>
                <textarea
                  className={`${fieldClass} min-h-20`}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <SectionCard title={t('sales.totals')}>
            <dl className="space-y-2 text-sm">
              {lines.length > 1 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{t('sales.lineCount')}</dt>
                  <dd className="text-ink-soft">{lines.length}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{t('sales.totalSale')}</dt>
                <dd className="font-medium text-ink">{formatMoney(totals.totalSalePrice)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{t('sales.costPrice')}</dt>
                <dd className="text-ink-soft">{formatMoney(totals.totalCostPrice)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{t('sales.grossProfit')}</dt>
                <dd className="text-ink-soft">{formatMoney(totals.grossProfit)}</dd>
              </div>
              {(effectiveAssemblerFee > 0 || effectiveDriverFee > 0) && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{t('sales.netProfit')}</dt>
                  <dd className="text-ink-soft">{formatMoney(totals.netProfit)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{t('sales.deposit')}</dt>
                <dd className="text-ink-soft">{formatMoney(totals.depositAmount)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-line pt-2">
                <dt className="font-medium text-ink">{t('sales.remaining')}</dt>
                <dd className="font-semibold text-ink">{formatMoney(totals.remainingAmount)}</dd>
              </div>
            </dl>

            {formError ? (
              <p role="alert" className="mt-4 text-sm text-danger-600">
                {formError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={createSale.isPending}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {createSale.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t('sales.saveSale')}
            </button>
          </SectionCard>
        </aside>
      </form>

      <ConfirmDialog
        open={confirmMissingCost}
        title={t('sales.missingCostTitle')}
        message={<p>{t('sales.missingCostMessage')}</p>}
        confirmLabel={t('common.confirmContinue')}
        cancelLabel={t('common.goBack')}
        busy={createSale.isPending}
        onCancel={() => setConfirmMissingCost(false)}
        onConfirm={() => {
          setConfirmMissingCost(false);
          void submitSale();
        }}
      />
    </PageContainer>
  );
}
