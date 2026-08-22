import type { WorkerFinancialTransaction } from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { useReverseWorkerFinancialTransaction } from '@/features/workers/hooks/use-worker-finances';
import { WORKER_FINANCE_TYPE_LABELS } from '@/features/workers/utils/finance-labels';
import { ApiClientError } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/utils/format';

interface ReverseWorkerFinancialTransactionDialogProps {
  open: boolean;
  transaction: WorkerFinancialTransaction | null;
  onClose: () => void;
  onReversed?: () => void;
}

function toFriendlyError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isUnauthorized) return 'Iltimos, qayta kiring.';
    if (error.isForbidden) return "Bu amalni bajarish huquqingiz yo'q.";
    if (error.status === 404) return 'Operatsiya topilmadi.';
    if (error.status === 409) return 'Bu operatsiya allaqachon qaytarilgan.';
    if (error.isValidationError) {
      return error.message || "Ma'lumotlarni tekshirib, qayta urinib ko'ring.";
    }
    if (error.status === 0) return error.message;
    if (error.status >= 500) return 'Operatsiyani qaytarishda xatolik yuz berdi.';
    return error.message || 'Operatsiyani qaytarishda xatolik yuz berdi.';
  }
  return 'Operatsiyani qaytarishda xatolik yuz berdi.';
}

/**
 * Confirm offsetting a ledger row. Never deletes the original; backend creates REVERSAL.
 */
export function ReverseWorkerFinancialTransactionDialog({
  open,
  transaction,
  onClose,
  onReversed,
}: ReverseWorkerFinancialTransactionDialogProps) {
  const reverseTransaction = useReverseWorkerFinancialTransaction();
  const isPending = reverseTransaction.isPending;
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    reverseTransaction.reset();
    // Reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-only reset
  }, [open]);

  async function handleConfirm() {
    if (!transaction || isPending) return;
    setFormError(null);
    try {
      await reverseTransaction.mutateAsync(transaction.id);
      onReversed?.();
      onClose();
    } catch (error) {
      setFormError(toFriendlyError(error));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isPending) onClose();
      }}
      title="Operatsiyani bekor qilish?"
      description="Bu operatsiya o'chirilmaydi. Uning teskarisi yaratiladi va moliyaviy hisobda aks ettiriladi."
      className="max-w-lg"
    >
      <div className="space-y-4">
        {transaction ? (
          <div className="rounded-input border border-line bg-canvas/50 px-3 py-2.5 text-sm text-ink">
            <dl className="space-y-1.5">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Turi</dt>
                <dd className="font-medium">
                  {WORKER_FINANCE_TYPE_LABELS[transaction.type] ?? transaction.type}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Summa</dt>
                <dd className="tabular-money font-medium">{formatMoney(transaction.amount)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Sana</dt>
                <dd className="font-medium">{formatDate(transaction.transactionDate)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Tavsif</dt>
                <dd className="max-w-[60%] truncate text-right font-medium">
                  {transaction.description?.trim() || '—'}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        <p className="text-sm text-ink-soft">
          Bekor qilingandan keyin asl operatsiya tarixda saqlanadi.
        </p>

        {formError ? (
          <p
            role="alert"
            className="rounded-input border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700"
          >
            {formError}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-input border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-60"
          >
            Yopish
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isPending || !transaction}
            className="inline-flex items-center justify-center gap-2 rounded-input bg-danger-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-danger-700 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isPending ? 'Qaytarilmoqda...' : 'Operatsiyani qaytarish'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
