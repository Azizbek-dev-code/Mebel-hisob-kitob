import { PaymentMethod, type PurchaseDetail } from '@furniture-erp/shared';
import { useEffect, useState } from 'react';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { lockBodyScroll } from '@/lib/body-scroll-lock';

import { MoneyField } from '@/features/sales/components/MoneyField';
import { ApiClientError } from '@/lib/api-client';
import { formatMoney } from '@/utils/format';

import { useAddSupplierPayment } from '../hooks/use-purchasing';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

interface PaySupplierDialogProps {
  purchase: PurchaseDetail;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function PaySupplierDialog({ purchase, onClose, onSuccess }: PaySupplierDialogProps) {
  const recordPayment = useAddSupplierPayment(purchase.id);
  const [amount, setAmount] = useState(purchase.remainingAmount);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!Number.isInteger(amount) || amount < 1) {
      setError('Miqdor noto‘g‘ri');
      return;
    }
    if (amount > purchase.remainingAmount) {
      setError(`Qarzdan oshib ketmasin (${formatMoney(purchase.remainingAmount)})`);
      return;
    }

    try {
      await recordPayment.mutateAsync({
        amount,
        method,
        note: note.trim() || undefined,
      });
      onSuccess(`Kirim #${purchase.purchaseNumber}: ${formatMoney(amount)} to‘landi`);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'To‘lov saqlanmadi');
    }
  }

  return (

    <ModalPortal>
        <div

          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"

          data-testid="pay-supplier-dialog"

        >

          <button

            type="button"

            className="absolute inset-0 cursor-default"

            aria-label="Yopish"

            onClick={onClose}

          />

          <form

            onSubmit={(e) => void submit(e)}

            className="relative z-10 w-full max-w-md rounded-card border border-line bg-surface p-5 shadow-lg"

          >

            <h3 className="text-lg font-semibold text-ink">Yetkazuvchiga to‘lov</h3>

            <p className="mt-1 text-sm text-ink-muted">

              {purchase.supplierName} · Kirim #{purchase.purchaseNumber}

            </p>

            <p className="mt-1 text-sm font-medium text-danger-700">

              Qolgan: {formatMoney(purchase.remainingAmount)}

            </p>

            <div className="mt-4 space-y-3">

              <MoneyField label="Miqdor" value={amount} onChange={setAmount} />

              <label className="block text-sm">

                <span className="mb-1 block font-medium text-ink">Usul</span>

                <select

                  className={fieldClass}

                  value={method}

                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}

                >

                  <option value={PaymentMethod.CASH}>Naqd</option>

                  <option value={PaymentMethod.CARD}>Karta</option>

                  <option value={PaymentMethod.TRANSFER}>O‘tkazma</option>

                  <option value={PaymentMethod.OTHER}>Boshqa</option>

                </select>

              </label>

              <label className="block text-sm">

                <span className="mb-1 block font-medium text-ink">Izoh</span>

                <textarea

                  className={fieldClass}

                  rows={2}

                  value={note}

                  onChange={(e) => setNote(e.target.value)}

                  placeholder="Ixtiyoriy"

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

                disabled={recordPayment.isPending}

                className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"

              >

                {recordPayment.isPending ? 'Saqlanmoqda…' : 'To‘lash'}

              </button>

            </div>

          </form>

        </div>

    </ModalPortal>

  );
}
