import { ProductStatus, type ProductListItem } from '@furniture-erp/shared';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { lockBodyScroll } from '@/lib/body-scroll-lock';

import { ApiClientError } from '@/lib/api-client';
import { parseMoneyInput } from '@/utils/format';

import {
  useCreateProduct,
  useProductCategories,
  useRemoveProductImage,
  useUpdateProduct,
  useUploadProductImage,
} from '../hooks/use-products';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export type ProductFormMode = 'create' | 'edit';

interface ProductFormDialogProps {
  mode: ProductFormMode;
  product?: ProductListItem | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (product: ProductListItem) => void;
}

function fieldError(error: unknown, field: string): string | null {
  if (!(error instanceof ApiClientError) || !error.details) return null;
  return error.details.find((d) => d.field === field)?.message ?? null;
}

export function ProductFormDialog({
  mode,
  product,
  open,
  onClose,
  onSaved,
}: ProductFormDialogProps) {
  const categories = useProductCategories(false, open);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const uploadImage = useUploadProductImage();
  const removeImage = useRemoveProductImage();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [minStockQty, setMinStockQty] = useState('0');
  const [trackStock, setTrackStock] = useState(true);
  const [status, setStatus] = useState<typeof ProductStatus.ACTIVE | typeof ProductStatus.ARCHIVED>(
    ProductStatus.ACTIVE,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setImageFile(null);
    setRemoveExistingImage(false);
    if (mode === 'edit' && product) {
      setName(product.name);
      setSku(product.sku ?? '');
      setCategoryId(product.categoryId ?? '');
      setDescription(product.description ?? '');
      setSalePrice(String(product.defaultSalePrice));
      setCostPrice(String(product.costPrice));
      setMinStockQty(String(product.minStockQty));
      setTrackStock(product.trackStock);
      setStatus(product.status);
    } else {
      setName('');
      setSku('');
      setCategoryId('');
      setDescription('');
      setSalePrice('');
      setCostPrice('');
      setMinStockQty('0');
      setTrackStock(true);
      setStatus(ProductStatus.ACTIVE);
    }
  }, [open, mode, product]);

  useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);

  const previewUrl = useMemo(() => {
    if (imageFile) return URL.createObjectURL(imageFile);
    if (removeExistingImage) return null;
    return product?.imageUrl ?? null;
  }, [imageFile, product?.imageUrl, removeExistingImage]);

  useEffect(() => {
    if (!imageFile || !previewUrl?.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile, previewUrl]);

  if (!open) return null;

  const busy =
    createProduct.isPending ||
    updateProduct.isPending ||
    uploadImage.isPending ||
    removeImage.isPending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const sale = parseMoneyInput(salePrice);
    const cost = parseMoneyInput(costPrice);
    if (!name.trim()) {
      setFormError('Nomi majburiy');
      return;
    }
    if (sale === null || sale < 0) {
      setFormError('Sotuv narxi noto‘g‘ri');
      return;
    }
    if (cost === null || cost < 0) {
      setFormError('Tannarx noto‘g‘ri');
      return;
    }
    const minQty = Number.parseInt(minStockQty, 10);
    if (!Number.isFinite(minQty) || minQty < 0) {
      setFormError('Minimal zaxira noto‘g‘ri');
      return;
    }

    try {
      let saved: ProductListItem;
      if (mode === 'create') {
        saved = await createProduct.mutateAsync({
          name: name.trim(),
          defaultSalePrice: sale,
          costPrice: cost,
          sku: sku.trim() || null,
          categoryId: categoryId || null,
          description: description.trim() || null,
          minStockQty: minQty,
          trackStock,
        });
      } else {
        saved = await updateProduct.mutateAsync({
          id: product!.id,
          body: {
            name: name.trim(),
            defaultSalePrice: sale,
            costPrice: cost,
            sku: sku.trim() || null,
            categoryId: categoryId || null,
            description: description.trim() || null,
            minStockQty: minQty,
            trackStock,
            status,
          },
        });
      }

      if (removeExistingImage && mode === 'edit' && product?.imageUrl && !imageFile) {
        saved = await removeImage.mutateAsync(saved.id);
      }
      if (imageFile) {
        saved = await uploadImage.mutateAsync({ id: saved.id, file: imageFile });
      }

      onSaved?.(saved);
      onClose();
    } catch (error) {
      const message =
        fieldError(error, 'sku') ||
        fieldError(error, 'name') ||
        fieldError(error, 'defaultSalePrice') ||
        fieldError(error, 'costPrice') ||
        fieldError(error, 'image') ||
        (error instanceof ApiClientError ? error.message : null) ||
        'Saqlab bo‘lmadi';
      setFormError(message);
    }
  }

  return (

    <ModalPortal>
        <div

          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"

          role="dialog"

          aria-modal="true"

          aria-labelledby="product-form-title"

        >

          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-5 shadow-lg">

            <h2 id="product-form-title" className="text-lg font-semibold text-ink">

              {mode === 'create' ? 'Yangi mebel qo‘shish' : 'Mebelni tahrirlash'}

            </h2>

            <p className="mt-1 text-sm text-ink-muted">

              Narx o‘zgarishi faqat yangi sotuvlarga ta’sir qiladi — tarixiy sotuvlar saqlanadi.

            </p>

            <form className="mt-4 space-y-3" onSubmit={(e) => void handleSubmit(e)}>

              <label className="block text-sm">

                <span className="mb-1 block text-ink-soft">Nomi *</span>

                <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />

              </label>

              <div className="grid gap-3 sm:grid-cols-2">

                <label className="block text-sm">

                  <span className="mb-1 block text-ink-soft">SKU</span>

                  <input className={fieldClass} value={sku} onChange={(e) => setSku(e.target.value)} />

                </label>

                <label className="block text-sm">

                  <span className="mb-1 block text-ink-soft">Kategoriya</span>

                  <select

                    className={fieldClass}

                    value={categoryId}

                    onChange={(e) => setCategoryId(e.target.value)}

                  >

                    <option value="">—</option>

                    {(categories.data ?? []).map((cat) => (

                      <option key={cat.id} value={cat.id}>

                        {cat.name}

                      </option>

                    ))}

                  </select>

                </label>

              </div>

              <div className="grid gap-3 sm:grid-cols-2">

                <label className="block text-sm">

                  <span className="mb-1 block text-ink-soft">Sotuv narxi *</span>

                  <input

                    className={fieldClass}

                    inputMode="numeric"

                    value={salePrice}

                    onChange={(e) => setSalePrice(e.target.value)}

                  />

                </label>

                <label className="block text-sm">

                  <span className="mb-1 block text-ink-soft">Tannarx *</span>

                  <input

                    className={fieldClass}

                    inputMode="numeric"

                    value={costPrice}

                    onChange={(e) => setCostPrice(e.target.value)}

                  />

                </label>

              </div>

              <label className="block text-sm">

                <span className="mb-1 block text-ink-soft">Tavsif</span>

                <textarea

                  className={fieldClass}

                  rows={3}

                  value={description}

                  onChange={(e) => setDescription(e.target.value)}

                />

              </label>

              <div className="grid gap-3 sm:grid-cols-2">

                <label className="block text-sm">

                  <span className="mb-1 block text-ink-soft">Min. zaxira</span>

                  <input

                    className={fieldClass}

                    inputMode="numeric"

                    value={minStockQty}

                    onChange={(e) => setMinStockQty(e.target.value)}

                  />

                </label>

                {mode === 'edit' ? (

                  <label className="block text-sm">

                    <span className="mb-1 block text-ink-soft">Holat</span>

                    <select

                      className={fieldClass}

                      value={status}

                      onChange={(e) =>

                        setStatus(e.target.value as typeof ProductStatus.ACTIVE | typeof ProductStatus.ARCHIVED)

                      }

                    >

                      <option value={ProductStatus.ACTIVE}>Faol</option>

                      <option value={ProductStatus.ARCHIVED}>Arxiv</option>

                    </select>

                  </label>

                ) : (

                  <label className="flex items-end gap-2 pb-2 text-sm text-ink">

                    <input

                      type="checkbox"

                      checked={trackStock}

                      onChange={(e) => setTrackStock(e.target.checked)}

                    />

                    Zaxirani kuzatish

                  </label>

                )}

              </div>

              {mode === 'edit' ? (

                <label className="flex items-center gap-2 text-sm text-ink">

                  <input

                    type="checkbox"

                    checked={trackStock}

                    onChange={(e) => setTrackStock(e.target.checked)}

                  />

                  Zaxirani kuzatish

                </label>

              ) : null}

              <div className="space-y-2">

                <span className="block text-sm text-ink-soft">Rasm</span>

                {previewUrl ? (

                  <img

                    src={previewUrl}

                    alt=""

                    className="h-28 w-28 rounded-input border border-line object-cover"

                  />

                ) : (

                  <div className="flex h-28 w-28 items-center justify-center rounded-input border border-dashed border-line text-xs text-ink-muted">

                    Rasm yo‘q

                  </div>

                )}

                <div className="flex flex-wrap gap-2">

                  <label className="cursor-pointer rounded-input border border-line px-2 py-1 text-xs font-medium text-ink hover:bg-surface-hover">

                    Tanlash

                    <input

                      type="file"

                      accept="image/jpeg,image/png,image/webp,image/gif"

                      className="hidden"

                      onChange={(e) => {

                        const file = e.target.files?.[0] ?? null;

                        setImageFile(file);

                        setRemoveExistingImage(false);

                      }}

                    />

                  </label>

                  {(previewUrl || product?.imageUrl) && (

                    <button

                      type="button"

                      className="rounded-input border border-line px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"

                      onClick={() => {

                        setImageFile(null);

                        setRemoveExistingImage(true);

                      }}

                    >

                      Olib tashlash

                    </button>

                  )}

                </div>

              </div>

              {formError ? <p className="text-sm text-danger-700">{formError}</p> : null}

              <div className="flex justify-end gap-2 pt-2">

                <button

                  type="button"

                  onClick={onClose}

                  disabled={busy}

                  className="rounded-input border border-line px-3 py-2 text-sm text-ink hover:bg-surface-hover"

                >

                  Bekor

                </button>

                <button

                  type="submit"

                  disabled={busy}

                  className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"

                >

                  {busy ? 'Saqlanmoqda…' : 'Saqlash'}

                </button>

              </div>

            </form>

          </div>

        </div>

    </ModalPortal>

  );
}
