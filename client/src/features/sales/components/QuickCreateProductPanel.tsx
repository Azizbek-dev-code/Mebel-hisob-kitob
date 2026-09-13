import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useCreateProduct,
  useProductCategories,
} from '@/features/products/hooks/use-products';
import { ApiClientError } from '@/lib/api-client';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { formatMoney } from '@/utils/format';

import { MoneyField } from './MoneyField';
import type { SearchSelectOption } from './SearchSelect';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export interface QuickCreateProductResult {
  option: SearchSelectOption;
  costPrice: number;
  salePrice: number;
  quantity: number;
}

interface QuickCreateProductPanelProps {
  onCreated: (result: QuickCreateProductResult) => void;
  onCancel: () => void;
}

function fieldError(error: unknown, field: string): string | null {
  if (!(error instanceof ApiClientError) || !error.details) return null;
  return error.details.find((detail) => detail.field === field)?.message ?? null;
}

/**
 * Sale-page quick product create — mirrors the inline "New customer" panel.
 * Reuses POST /products (stockQty stays 0; no warehouse inbound movement).
 */
export function QuickCreateProductPanel({ onCreated, onCancel }: QuickCreateProductPanelProps) {
  const { t } = useTranslation();
  const createProduct = useCreateProduct();
  const categories = useProductCategories(false, true);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [material, setMaterial] = useState('');
  const [notes, setNotes] = useState('');
  const [trackStock, setTrackStock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmMissingCost, setConfirmMissingCost] = useState(false);

  async function persist() {
    setError(null);

    if (!name.trim()) {
      setError(t('products.nameRequiredError'));
      return;
    }
    if (!categoryId) {
      setError(t('products.categoryRequiredError'));
      return;
    }
    if (!(salePrice > 0)) {
      setError(t('products.salePriceMustBePositive'));
      return;
    }
    if (costPrice < 0) {
      setError(t('products.costNegative'));
      return;
    }
    if (!(quantity > 0)) {
      setError(t('products.qtyMustBePositive'));
      return;
    }

    const descriptionParts = [
      size.trim() ? t('products.descSize', { value: size.trim() }) : null,
      color.trim() ? t('products.descColor', { value: color.trim() }) : null,
      material.trim() ? t('products.descMaterial', { value: material.trim() }) : null,
      notes.trim() || null,
    ].filter((part): part is string => Boolean(part));

    try {
      const created = await createProduct.mutateAsync({
        name: name.trim(),
        costPrice,
        defaultSalePrice: salePrice,
        sku: null,
        categoryId,
        description: descriptionParts.length > 0 ? descriptionParts.join('\n') : null,
        minStockQty: 0,
        trackStock,
      });

      onCreated({
        option: {
          id: created.id,
          label: created.name,
          description: `${formatMoney(created.defaultSalePrice)}${
            created.sku ? ` · ${created.sku}` : ''
          }${created.trackStock ? ` · ${created.stockQty} ${t('common.pcs')}` : ''}`,
        },
        costPrice: created.costPrice,
        salePrice: created.defaultSalePrice,
        quantity: Math.max(1, quantity),
      });
    } catch (err) {
      setError(
        fieldError(err, 'sku') ||
          fieldError(err, 'categoryId') ||
          mutationErrorMessage(err, t('products.saveFailed')),
      );
    }
  }

  function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError(t('products.nameRequiredError'));
      return;
    }
    if (!(salePrice > 0)) {
      setError(t('products.salePriceMustBePositive'));
      return;
    }
    if (costPrice <= 0) {
      setConfirmMissingCost(true);
      return;
    }
    void persist();
  }

  return (
    <>
      <div
        className="mt-4 grid max-h-[min(70vh,32rem)] gap-3 overflow-y-auto rounded-card border border-line bg-surface-muted p-4 sm:grid-cols-2"
        data-testid="sale-quick-product-form"
      >
        <input
          className={fieldClass}
          placeholder={t('products.nameRequired')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          data-testid="sale-quick-product-name"
        />
        <select
          className={fieldClass}
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          required
          data-testid="sale-quick-product-category"
        >
          <option value="">{t('products.categorySelect')}</option>
          {(categories.data ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <div className="rounded-input border border-dashed border-line bg-surface px-3 py-2.5 text-sm text-ink-muted">
          {t('products.autoSkuShort')}
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-ink">{t('products.qtyRequired')}</label>
          <input
            type="number"
            min={1}
            className={fieldClass}
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
            data-testid="sale-quick-product-qty"
          />
        </div>
        <MoneyField label={t('sales.costPrice')} value={costPrice} onChange={setCostPrice} />
        <MoneyField
          label={t('products.salePriceRequired')}
          value={salePrice}
          onChange={setSalePrice}
        />
        <input
          className={fieldClass}
          placeholder={t('products.size')}
          value={size}
          onChange={(event) => setSize(event.target.value)}
        />
        <input
          className={fieldClass}
          placeholder={t('products.color')}
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
        <input
          className={fieldClass}
          placeholder={t('products.material')}
          value={material}
          onChange={(event) => setMaterial(event.target.value)}
        />
        <input
          className={fieldClass}
          placeholder={t('common.notes')}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <label className="flex items-start gap-2 text-sm text-ink sm:col-span-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={trackStock}
            onChange={(event) => setTrackStock(event.target.checked)}
            data-testid="sale-quick-product-track-stock"
          />
          <span>{t('products.trackStockHint')}</span>
        </label>
        {error ? (
          <p
            role="alert"
            className="text-sm text-danger-700 sm:col-span-2"
            data-testid="sale-quick-product-error"
          >
            {error}
          </p>
        ) : null}
        <div className="sticky bottom-0 flex flex-wrap gap-2 bg-surface-muted pt-1 sm:col-span-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-input border border-line px-3 py-2 text-sm hover:bg-surface-hover"
          >
            {t('products.cancelCreate')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={createProduct.isPending}
            className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            data-testid="sale-quick-product-save"
          >
            {createProduct.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {t('products.saveAndAddToSale')}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmMissingCost}
        title={t('sales.missingCostTitle')}
        message={<p>{t('sales.missingCostMessage')}</p>}
        confirmLabel={t('common.confirmContinue')}
        cancelLabel={t('common.goBack')}
        busy={createProduct.isPending}
        onCancel={() => setConfirmMissingCost(false)}
        onConfirm={() => {
          setConfirmMissingCost(false);
          void persist();
        }}
      />
    </>
  );
}
