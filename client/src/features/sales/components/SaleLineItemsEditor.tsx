import { PackagePlus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { formatMoney } from '@/utils/format';

import { MoneyField } from './MoneyField';
import { QuickCreateProductPanel } from './QuickCreateProductPanel';
import { SearchSelect, type SearchSelectOption } from './SearchSelect';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export type SaleLineDraft = {
  key: string;
  productId: string;
  label: string;
  description?: string;
  quantity: number;
  unitCostPrice: number;
  unitSalePrice: number;
};

export function newSaleLineKey(): string {
  return `line_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function saleLineFromProduct(input: {
  productId: string;
  label: string;
  description?: string;
  quantity?: number;
  unitCostPrice: number;
  unitSalePrice: number;
}): SaleLineDraft {
  return {
    key: newSaleLineKey(),
    productId: input.productId,
    label: input.label,
    description: input.description,
    quantity: input.quantity ?? 1,
    unitCostPrice: input.unitCostPrice,
    unitSalePrice: input.unitSalePrice,
  };
}

interface SaleLineItemsEditorProps {
  lines: SaleLineDraft[];
  onChange: (lines: SaleLineDraft[]) => void;
  productOptions: SearchSelectOption[];
  productQuery: string;
  onProductQueryChange: (value: string) => void;
  productsLoading?: boolean;
  /** Lookup rows used to fill cost / sale price when picking from search. */
  resolveProductPrices: (
    productId: string,
  ) => { costPrice: number; defaultSalePrice: number } | null;
  showQuickCreate?: boolean;
  showNewProduct: boolean;
  onToggleNewProduct: () => void;
  onCancelNewProduct: () => void;
  emptyMessage?: string;
}

/**
 * Multi-product line editor for create / edit sale forms.
 * Picker adds a line (or bumps qty if the same product is already listed).
 */
export function SaleLineItemsEditor({
  lines,
  onChange,
  productOptions,
  productQuery,
  onProductQueryChange,
  productsLoading,
  resolveProductPrices,
  showQuickCreate,
  showNewProduct,
  onToggleNewProduct,
  onCancelNewProduct,
  emptyMessage,
}: SaleLineItemsEditorProps) {
  const { t } = useTranslation();

  function addProduct(option: SearchSelectOption | null) {
    if (!option) return;
    if (lines.some((line) => line.productId === option.id)) return;
    const prices = resolveProductPrices(option.id);
    onChange([
      ...lines,
      saleLineFromProduct({
        productId: option.id,
        label: option.label,
        description: option.description,
        unitCostPrice: prices?.costPrice ?? 0,
        unitSalePrice: prices?.defaultSalePrice ?? 0,
      }),
    ]);
  }

  function updateLine(key: string, patch: Partial<SaleLineDraft>) {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function removeLine(key: string) {
    onChange(lines.filter((line) => line.key !== key));
  }

  const selectedIds = new Set(lines.map((line) => line.productId));
  const availableOptions = productOptions.filter((option) => !selectedIds.has(option.id));

  return (
    <div className="space-y-4" data-testid="sale-line-items">
      {lines.length > 0 ? (
        <ul className="space-y-3">
          {lines.map((line, index) => {
            const lineTotal = line.quantity * line.unitSalePrice;
            return (
              <li
                key={line.key}
                className="rounded-card border border-line bg-surface-muted/40 p-3 sm:p-4"
                data-testid={`sale-line-${index}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{line.label}</p>
                    {line.description ? (
                      <p className="truncate text-xs text-ink-muted">{line.description}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1 rounded-input border border-line px-2 py-1.5 text-xs font-medium text-danger-700 hover:bg-danger-50"
                    onClick={() => removeLine(line.key)}
                    aria-label={t('sales.removeLine')}
                    data-testid={`sale-line-remove-${index}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    {t('common.delete')}
                  </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-ink">
                      {t('sales.quantity')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      className={fieldClass}
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.key, {
                          quantity: Math.max(1, Number(event.target.value) || 1),
                        })
                      }
                      data-testid={`sale-line-qty-${index}`}
                    />
                  </div>
                  <MoneyField
                    label={t('sales.costPrice')}
                    value={line.unitCostPrice}
                    onChange={(value) => updateLine(line.key, { unitCostPrice: value })}
                  />
                  <MoneyField
                    label={t('sales.salePrice')}
                    value={line.unitSalePrice}
                    onChange={(value) => updateLine(line.key, { unitSalePrice: value })}
                  />
                </div>

                <p className="mt-2 text-right text-xs text-ink-muted">
                  {t('sales.lineTotal')}:{' '}
                  <span className="font-medium text-ink">{formatMoney(lineTotal)}</span>
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted" data-testid="sale-lines-empty">
          {t('sales.addProductsHint')}
        </p>
      )}

      <SearchSelect
        label={lines.length > 0 ? t('sales.addFurniture') : t('sales.existingFurniture')}
        placeholder={`${t('common.search')}…`}
        value={null}
        options={availableOptions}
        isLoading={productsLoading}
        query={productQuery}
        onQueryChange={onProductQueryChange}
        onChange={addProduct}
        emptyMessage={emptyMessage}
      />

      {showQuickCreate ? (
        <button
          type="button"
          onClick={onToggleNewProduct}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700"
          data-testid="sale-quick-product-toggle"
        >
          <PackagePlus className="size-4" aria-hidden="true" />
          {t('sales.newFurniture')}
        </button>
      ) : null}

      {showNewProduct && showQuickCreate ? (
        <QuickCreateProductPanel
          onCancel={onCancelNewProduct}
          onCreated={({ option, costPrice, salePrice, quantity: createdQty }) => {
            const existing = lines.find((line) => line.productId === option.id);
            if (existing) {
              onChange(
                lines.map((line) =>
                  line.key === existing.key
                    ? {
                        ...line,
                        quantity: line.quantity + createdQty,
                        unitCostPrice: costPrice,
                        unitSalePrice: salePrice,
                      }
                    : line,
                ),
              );
            } else {
              onChange([
                ...lines,
                saleLineFromProduct({
                  productId: option.id,
                  label: option.label,
                  description: option.description,
                  quantity: createdQty,
                  unitCostPrice: costPrice,
                  unitSalePrice: salePrice,
                }),
              ]);
            }
            onCancelNewProduct();
          }}
        />
      ) : null}
    </div>
  );
}
