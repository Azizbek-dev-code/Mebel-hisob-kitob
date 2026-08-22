import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';

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
  const createProduct = useCreateProduct();
  const categories = useProductCategories(false, true);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sku, setSku] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [material, setMaterial] = useState('');
  const [notes, setNotes] = useState('');
  const [trackStock, setTrackStock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);

    if (!name.trim()) {
      setError('Nomi majburiy');
      return;
    }
    if (!(salePrice > 0)) {
      setError('Sotuv narxi 0 dan katta bo‘lishi kerak');
      return;
    }
    if (costPrice < 0) {
      setError('Tannarx manfiy bo‘lishi mumkin emas');
      return;
    }
    if (!(quantity > 0)) {
      setError('Miqdor 0 dan katta bo‘lishi kerak');
      return;
    }

    const descriptionParts = [
      size.trim() ? `O‘lcham: ${size.trim()}` : null,
      color.trim() ? `Rang: ${color.trim()}` : null,
      material.trim() ? `Material: ${material.trim()}` : null,
      notes.trim() || null,
    ].filter((part): part is string => Boolean(part));

    try {
      const created = await createProduct.mutateAsync({
        name: name.trim(),
        costPrice,
        defaultSalePrice: salePrice,
        sku: sku.trim() || null,
        categoryId: categoryId || null,
        description: descriptionParts.length > 0 ? descriptionParts.join('\n') : null,
        minStockQty: 0,
        // No warehouse inbound. Default off so the line can sell immediately;
        // enabling tracking keeps existing insufficient-stock checks on submit.
        trackStock,
      });

      onCreated({
        option: {
          id: created.id,
          label: created.name,
          description: `${formatMoney(created.defaultSalePrice)}${
            created.sku ? ` · ${created.sku}` : ''
          }${created.trackStock ? ` · ${created.stockQty} dona` : ''}`,
        },
        costPrice: created.costPrice,
        salePrice: created.defaultSalePrice,
        quantity: Math.max(1, quantity),
      });
    } catch (err) {
      setError(
        fieldError(err, 'sku') ||
          fieldError(err, 'categoryId') ||
          mutationErrorMessage(err, 'Mebel saqlanmadi.'),
      );
    }
  }

  return (
    <div
      className="mt-4 grid max-h-[min(70vh,32rem)] gap-3 overflow-y-auto rounded-card border border-line bg-surface-muted p-4 sm:grid-cols-2"
      data-testid="sale-quick-product-form"
    >
      <input
        className={fieldClass}
        placeholder="Nomi *"
        value={name}
        onChange={(event) => setName(event.target.value)}
        data-testid="sale-quick-product-name"
      />
      <select
        className={fieldClass}
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
        data-testid="sale-quick-product-category"
      >
        <option value="">Kategoriya (ixtiyoriy)</option>
        {(categories.data ?? []).map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <input
        className={fieldClass}
        placeholder="Model / SKU"
        value={sku}
        onChange={(event) => setSku(event.target.value)}
        data-testid="sale-quick-product-sku"
      />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-ink">Miqdor *</label>
        <input
          type="number"
          min={1}
          className={fieldClass}
          value={quantity}
          onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
          data-testid="sale-quick-product-qty"
        />
      </div>
      <MoneyField label="Tannarx" value={costPrice} onChange={setCostPrice} />
      <MoneyField label="Sotuv narxi *" value={salePrice} onChange={setSalePrice} />
      <input
        className={fieldClass}
        placeholder="O‘lcham"
        value={size}
        onChange={(event) => setSize(event.target.value)}
      />
      <input
        className={fieldClass}
        placeholder="Rang"
        value={color}
        onChange={(event) => setColor(event.target.value)}
      />
      <input
        className={fieldClass}
        placeholder="Material"
        value={material}
        onChange={(event) => setMaterial(event.target.value)}
      />
      <input
        className={fieldClass}
        placeholder="Izoh"
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
        <span>
          Ombor zaxirasini kuzatish. Tezkor sotuv uchun o‘chirib qoldiring (omborga kirim
          bo‘lmaydi). Yoqilganda mavjud zaxira tekshiruvlari sotuvda ishlaydi.
        </span>
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
          Bekor qilish
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={createProduct.isPending}
          className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          data-testid="sale-quick-product-save"
        >
          {createProduct.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Saqlash va sotuvga qo‘shish
        </button>
      </div>
    </div>
  );
}
