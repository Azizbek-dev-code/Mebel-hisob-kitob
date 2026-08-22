import type { InventoryListItem } from '@furniture-erp/shared';
import { useEffect, useState } from 'react';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { lockBodyScroll } from '@/lib/body-scroll-lock';

import { ApiClientError } from '@/lib/api-client';

import { useStockAdjust, useStockIn, useStockOut } from '../hooks/use-inventory';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export type StockActionMode = 'in' | 'out' | 'adjust';

interface StockActionDialogProps {
  mode: StockActionMode;
  product: InventoryListItem;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function StockActionDialog({ mode, product, onClose, onSuccess }: StockActionDialogProps) {
  const stockIn = useStockIn();
  const stockOut = useStockOut();
  const adjust = useStockAdjust();
  const [quantity, setQuantity] = useState(mode === 'adjust' ? '-1' : '1');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pending = stockIn.isPending || stockOut.isPending || adjust.isPending;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const unlock = lockBodyScroll();
    return () => {
      window.removeEventListener('keydown', onKey);
      unlock();
    };
  }, [onClose]);

  const titles: Record<StockActionMode, string> = {
    in: 'Ombor kirimi',
    out: 'Ombor chiqimi',
    adjust: 'Zaxira tuzatish',
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || (mode !== 'adjust' && qty < 1) || (mode === 'adjust' && qty === 0)) {
      setError('Miqdorni to‘g‘ri kiriting');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Sabab kamida 3 ta belgidan iborat bo‘lishi kerak');
      return;
    }

    try {
      if (mode === 'in') {
        await stockIn.mutateAsync({
          productId: product.id,
          quantity: qty,
          reason: reason.trim(),
        });
        onSuccess(`${product.name}: +${qty} dona`);
      } else if (mode === 'out') {
        await stockOut.mutateAsync({
          productId: product.id,
          quantity: qty,
          reason: reason.trim(),
        });
        onSuccess(`${product.name}: −${qty} dona`);
      } else {
        await adjust.mutateAsync({
          productId: product.id,
          quantity: qty,
          reason: reason.trim(),
        });
        onSuccess(`${product.name}: ${qty > 0 ? '+' : ''}${qty} dona`);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Saqlab bo‘lmadi');
    }
  }

  return (

    <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">

          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />

          <form

            onSubmit={submit}

            className="relative z-10 w-full max-w-md rounded-card border border-line bg-surface p-5 shadow-lg"

          >

            <h3 className="text-lg font-semibold text-ink">{titles[mode]}</h3>

            <p className="mt-1 text-sm text-ink-muted">

              {product.name}

              {product.sku ? ` · ${product.sku}` : ''} — hozir {product.stockQty} dona

            </p>

            <div className="mt-4 space-y-3">

              <label className="block text-sm">

                <span className="mb-1 block font-medium text-ink">Miqdor</span>

                <input

                  className={fieldClass}

                  type="number"

                  step={1}

                  value={quantity}

                  onChange={(e) => setQuantity(e.target.value)}

                  required

                />

                {mode === 'adjust' ? (

                  <span className="mt-1 block text-xs text-ink-muted">

                    Musbat — qo‘shish, manfiy — kamaytirish

                  </span>

                ) : null}

              </label>

              <label className="block text-sm">

                <span className="mb-1 block font-medium text-ink">Sabab</span>

                <textarea

                  className={fieldClass}

                  rows={3}

                  value={reason}

                  onChange={(e) => setReason(e.target.value)}

                  placeholder={

                    mode === 'in'

                      ? 'Masalan: Supplier delivery'

                      : mode === 'out'

                        ? 'Masalan: Damaged furniture'

                        : 'Masalan: Inventory count correction'

                  }

                  required

                />

              </label>

            </div>

            {error ? <p className="mt-3 text-sm text-danger-700">{error}</p> : null}

            <div className="mt-5 flex justify-end gap-2">

              <button

                type="button"

                onClick={onClose}

                className="rounded-input border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-surface-hover"

              >

                Bekor

              </button>

              <button

                type="submit"

                disabled={pending}

                className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"

              >

                {pending ? 'Saqlanmoqda…' : 'Tasdiqlash'}

              </button>

            </div>

          </form>

        </div>

    </ModalPortal>

  );
}
