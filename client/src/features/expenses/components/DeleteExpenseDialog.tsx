import type { ExpenseListItem } from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { ApiClientError } from '@/lib/api-client';
import { formatMoney } from '@/utils/format';

import { useCancelExpense } from '../hooks/use-expenses';
import { formatExpenseDay } from '../utils/date';

interface DeleteExpenseDialogProps {
  open: boolean;
  expense: ExpenseListItem | null;
  onClose: () => void;
  onDeleted: () => void;
}

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

function toFriendlyError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isUnauthorized) return 'Please sign in again.';
    if (error.isForbidden) return 'You do not have permission to cancel expenses.';
    if (error.status === 0) return error.message;
    if (error.status >= 500) return 'Something went wrong on the server. Try again.';
    return error.message || "Xarajatni bekor qilib bo'lmadi.";
  }
  return "Xarajatni bekor qilib bo'lmadi.";
}

/** Soft-void dialog (kept filename for existing page imports). */
export function DeleteExpenseDialog({
  open,
  expense,
  onClose,
  onDeleted,
}: DeleteExpenseDialogProps) {
  const cancelExpense = useCancelExpense();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      cancelExpense.reset();
      setReason('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-only reset
  }, [open]);

  async function handleCancel() {
    if (!expense || cancelExpense.isPending) return;
    if (reason.trim().length < 3) return;
    try {
      await cancelExpense.mutateAsync({
        id: expense.id,
        body: { reason: reason.trim() },
      });
      onDeleted();
      onClose();
    } catch {
      // Error is shown via cancelExpense.error below; keep dialog open.
    }
  }

  const errorMessage = cancelExpense.isError ? toFriendlyError(cancelExpense.error) : null;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!cancelExpense.isPending) onClose();
      }}
      title="Xarajatni bekor qilish?"
      description="Qator tarixda qoladi, lekin hisobotlardan chiqariladi."
    >
      <div className="space-y-4">
        {expense ? (
          <div className="rounded-input border border-line bg-canvas/50 px-3 py-2.5 text-sm">
            <p className="font-medium text-ink">{expense.category.name}</p>
            <p className="mt-0.5 text-ink-muted">
              {formatExpenseDay(expense.expenseDate)} · {formatMoney(expense.amount)}
            </p>
            {expense.description ? (
              <p className="mt-1 truncate text-ink-soft">{expense.description}</p>
            ) : null}
          </div>
        ) : null}

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ink">Sabab</span>
          <textarea
            className={fieldClass}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Masalan: Duplicate entry"
            required
          />
        </label>

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-input border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={cancelExpense.isPending}
            className="rounded-input border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-60"
          >
            Yopish
          </button>
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={cancelExpense.isPending || !expense || reason.trim().length < 3}
            className="inline-flex items-center justify-center gap-2 rounded-input bg-danger-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-danger-700 disabled:opacity-60"
          >
            {cancelExpense.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Bekor qilinmoqda...
              </>
            ) : (
              'Bekor qilish'
            )}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
