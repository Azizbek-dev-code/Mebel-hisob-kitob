import {
  calculateSaleTotals,
  PaymentMethod,
  PaymentType,
  WorkerResponsibility,
  type CreateSaleRequest,
} from '@furniture-erp/shared';
import { ArrowLeft, Loader2, PackagePlus, Plus, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { useSubscription } from '@/features/subscription/subscription-context';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { canManageInventory } from '@/routes/navigation';
import { ROUTES } from '@/routes/paths';
import { formatMoney } from '@/utils/format';
import { paymentMethodLabel, paymentTypeLabel } from '@/utils/sales';

import { MoneyField } from '../components/MoneyField';
import { QuickCreateProductPanel } from '../components/QuickCreateProductPanel';
import { SearchSelect, type SearchSelectOption } from '../components/SearchSelect';
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
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const { canWrite, openGate } = useSubscription();
  const createSale = useCreateSale();
  const createCustomer = useCreateCustomer();
  const canQuickCreateProduct = canManageInventory(currentUser.data);

  const [customerQuery, setCustomerQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [customer, setCustomer] = useState<SearchSelectOption | null>(null);
  const [product, setProduct] = useState<SearchSelectOption | null>(null);
  const [sellerId, setSellerId] = useState('');
  const [assemblerId, setAssemblerId] = useState('');
  const [deliveryPersonId, setDeliveryPersonId] = useState('');

  const [quantity, setQuantity] = useState(1);
  const [unitCostPrice, setUnitCostPrice] = useState(0);
  const [unitSalePrice, setUnitSalePrice] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.DEPOSIT);
  const [installmentMonthCount, setInstallmentMonthCount] = useState(3);
  const [assemblerFee, setAssemblerFee] = useState(0);
  const [driverFee, setDriverFee] = useState(0);

  const [deliveryRequired, setDeliveryRequired] = useState(false);
  const [installationRequired, setInstallationRequired] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const customers = useCustomerLookup(customerQuery);
  const products = useProductLookup(productQuery);
  const sellers = useWorkerLookup('', WorkerResponsibility.SELLER);
  const assemblers = useWorkerLookup('', WorkerResponsibility.ASSEMBLER);
  const deliveryWorkers = useWorkerLookup('', WorkerResponsibility.DELIVERY);

  // Default seller to the signed-in user once workers load.
  const effectiveSellerId = sellerId || currentUser.data?.id || '';

  const totals = useMemo(
    () =>
      calculateSaleTotals({
        items: product
          ? [{ quantity, unitCostPrice, unitSalePrice }]
          : [],
        discountAmount,
        depositAmount,
        costs: {
          installationCost: assemblerFee,
          deliveryCost: driverFee,
        },
      }),
    [
      product,
      quantity,
      unitCostPrice,
      unitSalePrice,
      discountAmount,
      depositAmount,
      assemblerFee,
      driverFee,
    ],
  );

  const customerOptions: SearchSelectOption[] = (customers.data ?? []).map((item) => ({
    id: item.id,
    label: `${item.firstName} ${item.lastName}`,
    description: item.phone,
  }));

  const productOptions: SearchSelectOption[] = (products.data ?? []).map((item) => ({
    id: item.id,
    label: item.name,
    description: `${formatMoney(item.defaultSalePrice)}${item.sku ? ` · ${item.sku}` : ''}${
      item.trackStock ? ` · ${item.stockQty} dona` : ''
    }`,
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
        description: created.phone,
      });
      setShowNewCustomer(false);
      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');
      setNewAddress('');
    } catch (error) {
      setFormError(mutationErrorMessage(error, "Mijoz saqlanmadi."));
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite) {
      openGate();
      return;
    }
    setFormError(null);

    if (!customer || !product) {
      setFormError('Select a customer and a product');
      return;
    }
    if (!effectiveSellerId) {
      setFormError('Select a seller');
      return;
    }

    const body: CreateSaleRequest = {
      customerId: customer.id,
      sellerId: effectiveSellerId,
      items: [
        {
          productId: product.id,
          quantity,
          unitCostPrice,
          unitSalePrice,
        },
      ],
      discountAmount,
      paymentType,
      depositAmount,
      depositMethod,
      installmentMonthCount:
        paymentType === PaymentType.INSTALLMENT ? installmentMonthCount : undefined,
      assemblerFee,
      driverFee,
      assemblerId: assemblerId || undefined,
      installationRequired: installationRequired || Boolean(assemblerId),
      deliveryRequired,
      deliveryPersonId: deliveryRequired ? deliveryPersonId || undefined : undefined,
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

  return (
    <PageContainer className="space-y-6">
      <div className="flex items-start gap-3">
        <Link
          to={ROUTES.sales}
          className="mt-1 rounded-input border border-line p-2 text-ink-muted hover:bg-surface-hover hover:text-ink"
          aria-label="Back to sales"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">New sale</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Customer, furniture, deposit and assembly — aim for under two minutes.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SectionCard
            title="Customer"
            action={
              <button
                type="button"
                onClick={() => setShowNewCustomer((value) => !value)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700"
              >
                <UserPlus className="size-4" />
                New customer
              </button>
            }
          >
            <SearchSelect
              label="Existing customer"
              placeholder="Search by name or phone"
              value={customer}
              options={customerOptions}
              isLoading={customers.isFetching}
              query={customerQuery}
              onQueryChange={setCustomerQuery}
              onChange={setCustomer}
              emptyMessage="No customer found"
            />

            {showNewCustomer ? (
              <div className="mt-4 grid gap-3 rounded-card border border-line bg-surface-muted p-4 sm:grid-cols-2">
                <input
                  className={fieldClass}
                  placeholder="First name"
                  value={newFirstName}
                  onChange={(event) => setNewFirstName(event.target.value)}
                />
                <input
                  className={fieldClass}
                  placeholder="Last name"
                  value={newLastName}
                  onChange={(event) => setNewLastName(event.target.value)}
                />
                <input
                  className={fieldClass}
                  placeholder="Phone"
                  value={newPhone}
                  onChange={(event) => setNewPhone(event.target.value)}
                />
                <input
                  className={fieldClass}
                  placeholder="Address (optional)"
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
                    {createCustomer.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Create and select
                  </button>
                </div>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Furniture"
            action={
              canQuickCreateProduct ? (
                <button
                  type="button"
                  onClick={() => setShowNewProduct((value) => !value)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700"
                  data-testid="sale-quick-product-toggle"
                >
                  <PackagePlus className="size-4" />
                  Yangi mebel qo‘shish
                </button>
              ) : undefined
            }
          >
            <div className="space-y-4">
              <SearchSelect
                label="Mavjud mebelni tanlash"
                placeholder="Mebel qidirish (nomi, SKU, kategoriya)…"
                value={product}
                options={productOptions}
                isLoading={products.isFetching}
                query={productQuery}
                onQueryChange={setProductQuery}
                onChange={(option) => {
                  setProduct(option);
                  const match = products.data?.find((item) => item.id === option?.id);
                  if (match) {
                    setUnitCostPrice(match.costPrice);
                    setUnitSalePrice(match.defaultSalePrice);
                  }
                }}
                emptyMessage="Mebel topilmadi"
              />

              {showNewProduct && canQuickCreateProduct ? (
                <QuickCreateProductPanel
                  onCancel={() => setShowNewProduct(false)}
                  onCreated={({ option, costPrice, salePrice, quantity: createdQty }) => {
                    setProduct(option);
                    setUnitCostPrice(costPrice);
                    setUnitSalePrice(salePrice);
                    setQuantity(createdQty);
                    setShowNewProduct(false);
                    setFormError(null);
                  }}
                />
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-ink">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    className={fieldClass}
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                  />
                </div>
                <MoneyField label="Cost price" value={unitCostPrice} onChange={setUnitCostPrice} />
                <MoneyField label="Sale price" value={unitSalePrice} onChange={setUnitSalePrice} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Payment">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink">Payment type</label>
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
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink">Deposit method</label>
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
              <MoneyField label="Deposit / zaklat" value={depositAmount} onChange={setDepositAmount} />
              <MoneyField label="Discount / bonus off" value={discountAmount} onChange={setDiscountAmount} />
              {paymentType === PaymentType.INSTALLMENT ? (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-ink">Installment months</label>
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
            </div>
          </SectionCard>

          <SectionCard title="People & fulfilment">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink">Sotuvchi</label>
                <select
                  className={fieldClass}
                  value={effectiveSellerId}
                  onChange={(event) => setSellerId(event.target.value)}
                  data-testid="sale-seller-select"
                >
                  <option value="">Select seller</option>
                  {(sellers.data ?? []).map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink">Assembly worker</label>
                <select
                  className={fieldClass}
                  value={assemblerId}
                  onChange={(event) => setAssemblerId(event.target.value)}
                >
                  <option value="">None</option>
                  {(assemblers.data ?? []).map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={installationRequired || Boolean(assemblerId)}
                  onChange={(event) => setInstallationRequired(event.target.checked)}
                />
                Installation required
              </label>

              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={deliveryRequired}
                  onChange={(event) => setDeliveryRequired(event.target.checked)}
                />
                Delivery required
              </label>

              {deliveryRequired ? (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-ink">Delivery person</label>
                    <select
                      className={fieldClass}
                      value={deliveryPersonId}
                      onChange={(event) => setDeliveryPersonId(event.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {(deliveryWorkers.data ?? []).map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-sm font-medium text-ink">Delivery address</label>
                    <input
                      className={fieldClass}
                      value={deliveryAddress}
                      onChange={(event) => setDeliveryAddress(event.target.value)}
                      placeholder="Customer address"
                    />
                  </div>
                </>
              ) : null}

              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-sm font-medium text-ink">Notes</label>
                <textarea
                  className={`${fieldClass} min-h-20`}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Xizmat haqlari"
            description="Ixtiyoriy. Usta va shopir summalari sotuv tannarxiga kiradi (netProfit)."
          >
            <div className="grid gap-3 sm:grid-cols-2" data-testid="sale-service-fees">
              <MoneyField
                label="Usta haqqi"
                value={assemblerFee}
                onChange={setAssemblerFee}
              />
              <MoneyField
                label="Shopir haqqi"
                value={driverFee}
                onChange={setDriverFee}
              />
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <SectionCard title="Totals">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Sale amount</dt>
                <dd className="font-medium text-ink">{formatMoney(totals.totalSalePrice)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Cost</dt>
                <dd className="text-ink-soft">{formatMoney(totals.totalCostPrice)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Gross profit</dt>
                <dd className="text-ink-soft">{formatMoney(totals.grossProfit)}</dd>
              </div>
              {(assemblerFee > 0 || driverFee > 0) && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Net profit</dt>
                  <dd className="text-ink-soft">{formatMoney(totals.netProfit)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Deposit</dt>
                <dd className="text-ink-soft">{formatMoney(totals.depositAmount)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-line pt-2">
                <dt className="font-medium text-ink">Remaining</dt>
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
              Save sale
            </button>
          </SectionCard>
        </aside>
      </form>
    </PageContainer>
  );
}
