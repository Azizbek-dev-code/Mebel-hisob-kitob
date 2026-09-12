import {
  PaymentMethod,
  SupplierStatus,
  WorkerResponsibility,
  type CreatePurchaseRequest,
} from '@furniture-erp/shared';
import { ArrowLeft, Plus, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { MoneyField } from '@/features/sales/components/MoneyField';
import {
  SearchSelect,
  type SearchSelectOption,
} from '@/features/sales/components/SearchSelect';
import { useWorkerLookup } from '@/features/sales/hooks/use-sales';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { formatMoney } from '@/utils/format';

import {
  useCreatePurchase,
  useCreateSupplier,
  useProductLookup,
  useSupplierDetail,
  useSuppliersList,
} from '../hooks/use-purchasing';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

interface LineDraft {
  key: string;
  product: SearchSelectOption | null;
  quantity: number;
  unitCost: number;
  productQuery: string;
}

function newLine(): LineDraft {
  return {
    key: `line_${Math.random().toString(36).slice(2, 9)}`,
    product: null,
    quantity: 1,
    unitCost: 0,
    productQuery: '',
  };
}

export function NewPurchasePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedSupplierId = searchParams.get('supplierId') ?? '';

  const createPurchase = useCreatePurchase();
  const createSupplier = useCreateSupplier();

  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplier, setSupplier] = useState<SearchSelectOption | null>(null);
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [notes, setNotes] = useState('');
  const [deliveredAt, setDeliveredAt] = useState('');
  const [deliveryDays, setDeliveryDays] = useState(0);
  const [driverId, setDriverId] = useState('');
  const [driverFee, setDriverFee] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const deliveryWorkers = useWorkerLookup('', WorkerResponsibility.DELIVERY);
  const suppliers = useSuppliersList({
    page: 1,
    pageSize: 20,
    search: supplierQuery || undefined,
    status: SupplierStatus.ACTIVE,
  });
  const preselected = useSupplierDetail(preselectedSupplierId || null, Boolean(preselectedSupplierId));

  useEffect(() => {
    if (!preselected.data || supplier) return;
    setSupplier({
      id: preselected.data.id,
      label: preselected.data.name,
      description: preselected.data.phone ?? undefined,
    });
  }, [preselected.data, supplier]);

  const supplierOptions: SearchSelectOption[] = (suppliers.data?.items ?? []).map((item) => ({
    id: item.id,
    label: item.name,
    description: item.phone ?? undefined,
  }));

  const totalCost = useMemo(
    () =>
      lines.reduce((sum, line) => {
        if (!line.product) return sum;
        return sum + line.quantity * line.unitCost;
      }, 0),
    [lines],
  );

  async function handleCreateSupplier() {
    setFormError(null);
    if (!newName.trim()) {
      setFormError('Yetkazuvchi nomi majburiy');
      return;
    }
    try {
      const created = await createSupplier.mutateAsync({
        name: newName.trim(),
        phone: newPhone.trim() || null,
        notes: newNotes.trim() || null,
      });
      setSupplier({
        id: created.id,
        label: created.name,
        description: created.phone ?? undefined,
      });
      setShowNewSupplier(false);
      setNewName('');
      setNewPhone('');
      setNewNotes('');
    } catch (error) {
      setFormError(
        error instanceof ApiClientError ? error.message : 'Yetkazuvchi yaratilmadi',
      );
    }
  }

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!supplier) {
      setFormError('Yetkazuvchini tanlang');
      return;
    }

    const filled = lines.filter((line) => line.product);
    if (filled.length === 0) {
      setFormError('Kamida bitta mahsulot kerak');
      return;
    }
    for (const line of filled) {
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        setFormError('Miqdor noto‘g‘ri');
        return;
      }
      if (!Number.isInteger(line.unitCost) || line.unitCost < 0) {
        setFormError('Narx noto‘g‘ri');
        return;
      }
    }
    if (paidAmount < 0 || (paidAmount > 0 && paidAmount > totalCost)) {
      setFormError('Boshlang‘ich to‘lov jami summadan oshmasin');
      return;
    }
    if (!Number.isInteger(deliveryDays) || deliveryDays < 0) {
      setFormError('Yetkazib berish muddati noto‘g‘ri');
      return;
    }
    if (!Number.isInteger(driverFee) || driverFee < 0) {
      setFormError('Shopir haqi noto‘g‘ri');
      return;
    }

    const body: CreatePurchaseRequest = {
      supplierId: supplier.id,
      items: filled.map((line) => ({
        productId: line.product!.id,
        quantity: line.quantity,
        unitCost: line.unitCost,
      })),
      paidAmount: paidAmount > 0 ? paidAmount : undefined,
      paymentMethod: paidAmount > 0 ? paymentMethod : undefined,
      notes: notes.trim() || null,
      deliveredAt: deliveredAt || undefined,
      deliveryDays,
      driverId: driverId || null,
      driverFee,
    };

    try {
      const purchase = await createPurchase.mutateAsync(body);
      navigate(ROUTES.purchaseDetail(purchase.id));
    } catch (error) {
      setFormError(error instanceof ApiClientError ? error.message : 'Kirim saqlanmadi');
    }
  }

  return (
    <PageContainer className="space-y-6">
      <div className="flex items-start gap-3">
        <Link
          to={ROUTES.purchases}
          className="mt-1 rounded-input border border-line p-2 text-ink-muted hover:bg-surface-hover hover:text-ink"
          aria-label="Kirimlarga qaytish"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Yangi kirim</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Yetkazuvchi, mahsulotlar va ixtiyoriy boshlang‘ich to‘lov.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <SectionCard
            title="Yetkazuvchi"
            action={
              <button
                type="button"
                onClick={() => setShowNewSupplier((v) => !v)}
                className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
              >
                <UserPlus className="size-4" />
                Yangi
              </button>
            }
          >
            <SearchSelect
              label="Qidiruv"
              placeholder="Nomi yoki telefon…"
              value={supplier}
              options={supplierOptions}
              isLoading={suppliers.isFetching}
              query={supplierQuery}
              onQueryChange={setSupplierQuery}
              onChange={setSupplier}
              emptyMessage="Yetkazuvchi topilmadi"
            />

            {showNewSupplier ? (
              <div className="mt-4 space-y-3 rounded-input border border-line bg-surface-muted p-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-ink-soft">Nomi</span>
                  <input
                    className={fieldClass}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-ink-soft">Telefon</span>
                  <input
                    className={fieldClass}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-ink-soft">Izoh</span>
                  <input
                    className={fieldClass}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleCreateSupplier()}
                  disabled={createSupplier.isPending}
                  className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {createSupplier.isPending ? 'Saqlanmoqda…' : 'Yetkazuvchini yaratish'}
                </button>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Mahsulotlar"
            description="Bir nechta qator qo‘shishingiz mumkin"
            action={
              <button
                type="button"
                onClick={() => setLines((prev) => [...prev, newLine()])}
                className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
              >
                <Plus className="size-4" />
                Qator
              </button>
            }
          >
            <div className="space-y-4">
              {lines.map((line) => (
                <PurchaseLineEditor
                  key={line.key}
                  line={line}
                  canRemove={lines.length > 1}
                  onChange={(patch) => updateLine(line.key, patch)}
                  onRemove={() =>
                    setLines((prev) => prev.filter((item) => item.key !== line.key))
                  }
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Yetkazib berish"
            description="Yuk olib kelingan bo‘lsa sanani kiriting — shopir haqi shunda hisobga tushadi. Hali yo‘lda bo‘lsa, bo‘sh qoldiring; shopir yakunlaganda haq yoziladi."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-ink">
                  Olib kelingan sana (ixtiyoriy)
                </span>
                <input
                  type="date"
                  className={fieldClass}
                  value={deliveredAt}
                  onChange={(e) => setDeliveredAt(e.target.value)}
                  data-testid="purchase-delivered-at"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-ink">
                  Necha kun ichida olib kelindi
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={fieldClass}
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(Number.parseInt(e.target.value, 10) || 0)}
                    data-testid="purchase-delivery-days"
                  />
                  <span className="shrink-0 text-sm text-ink-muted">kun</span>
                </div>
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(deliveryWorkers.data?.length ?? 0) > 0 ? (
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-ink">Shopir</span>
                  <select
                    className={fieldClass}
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    data-testid="purchase-driver"
                  >
                    <option value="">Tanlanmagan</option>
                    {(deliveryWorkers.data ?? []).map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.fullName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="text-sm text-ink-muted sm:col-span-1">
                  DELIVERY ishchi yo‘q — shopir haqini baribir kiritishingiz mumkin.
                </p>
              )}
              <MoneyField
                label="Shopir haqi"
                value={driverFee}
                onChange={setDriverFee}
                hint="Mahsulot narxiga qo‘shilmaydi"
              />
            </div>
          </SectionCard>

          <SectionCard title="To‘lov" description="0 = to‘liq kredit">
            <div className="grid gap-3 sm:grid-cols-2">
              <MoneyField
                label="Boshlang‘ich to‘lov"
                value={paidAmount}
                onChange={setPaidAmount}
                hint={`Jami: ${formatMoney(totalCost)}`}
              />
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-ink">Usul</span>
                <select
                  className={fieldClass}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  disabled={paidAmount <= 0}
                >
                  <option value={PaymentMethod.CASH}>Naqd</option>
                  <option value={PaymentMethod.CARD}>Karta</option>
                  <option value={PaymentMethod.TRANSFER}>O‘tkazma</option>
                  <option value={PaymentMethod.OTHER}>Boshqa</option>
                </select>
              </label>
            </div>
            <label className="mt-3 block text-sm">
              <span className="mb-1.5 block font-medium text-ink">Izoh</span>
              <textarea
                className={fieldClass}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </SectionCard>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <SectionCard title="Xulosa">
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between gap-3">
                <span className="text-ink-muted">Qatorlar</span>
                <span>{lines.filter((l) => l.product).length}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-ink-muted">Mahsulotlar</span>
                <span className="font-medium">{formatMoney(totalCost)}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-ink-muted">Shopir haqi</span>
                <span>{formatMoney(driverFee)}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-ink-muted">Boshlang‘ich to‘lov</span>
                <span>{formatMoney(paidAmount)}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-ink-muted">Qolgan qarz</span>
                <span className="font-medium text-danger-700">
                  {formatMoney(Math.max(0, totalCost - paidAmount))}
                </span>
              </li>
            </ul>

            {formError ? (
              <p className="mt-3 rounded-input border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-800">
                {formError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={createPurchase.isPending}
              className="mt-4 w-full rounded-input bg-brand-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {createPurchase.isPending ? 'Saqlanmoqda…' : 'Kirimni yaratish'}
            </button>
          </SectionCard>
        </aside>
      </form>
    </PageContainer>
  );
}

function PurchaseLineEditor({
  line,
  canRemove,
  onChange,
  onRemove,
}: {
  line: LineDraft;
  canRemove: boolean;
  onChange: (patch: Partial<LineDraft>) => void;
  onRemove: () => void;
}) {
  const products = useProductLookup(line.productQuery);
  const productOptions: SearchSelectOption[] = (products.data ?? []).map((item) => ({
    id: item.id,
    label: item.name,
    description: `${formatMoney(item.costPrice)}${item.sku ? ` · ${item.sku}` : ''}`,
  }));

  return (
    <div className="space-y-3 rounded-input border border-line p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <SearchSelect
            label="Mahsulot"
            placeholder="Qidirish…"
            value={line.product}
            options={productOptions}
            isLoading={products.isFetching}
            query={line.productQuery}
            onQueryChange={(value) => onChange({ productQuery: value })}
            onChange={(value) => {
              const match = (products.data ?? []).find((p) => p.id === value?.id);
              onChange({
                product: value,
                unitCost: match?.costPrice ?? line.unitCost,
              });
            }}
            emptyMessage="Mahsulot topilmadi"
          />
        </div>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="mt-7 rounded-input border border-line p-2 text-ink-muted hover:bg-danger-50 hover:text-danger-700"
            aria-label="Qatorni o‘chirish"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink">Miqdor</span>
          <input
            type="number"
            min={1}
            step={1}
            className={fieldClass}
            value={line.quantity}
            onChange={(e) => onChange({ quantity: Number(e.target.value) || 0 })}
          />
        </label>
        <MoneyField
          label="Birlik narxi"
          value={line.unitCost}
          onChange={(unitCost) => onChange({ unitCost })}
        />
      </div>
      {line.product ? (
        <p className="text-xs text-ink-muted">
          Qator: {formatMoney(line.quantity * line.unitCost)}
        </p>
      ) : null}
    </div>
  );
}
