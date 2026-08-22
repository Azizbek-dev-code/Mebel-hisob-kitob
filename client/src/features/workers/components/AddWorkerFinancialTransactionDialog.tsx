import {
  WorkerFinancialTransactionType,
  type CreateWorkerFinancialTransactionRequest,
  type WorkerFinancialCreatableType,
} from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { useCreateWorkerFinancialTransaction } from '@/features/workers/hooks/use-worker-finances';
import {
  WORKER_FINANCE_CREATE_TYPE_HELP,
  WORKER_FINANCE_CREATE_TYPE_OPTIONS,
} from '@/features/workers/utils/finance-labels';
import { todayStoreInputDate } from '@/features/workers/utils/period-range';
import { ApiClientError } from '@/lib/api-client';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

const DESCRIPTION_MAX = 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface AddWorkerFinancialTransactionDialogProps {
  open: boolean;
  workerId: string;
  onClose: () => void;
  onCreated?: () => void;
}

interface FieldErrors {
  type?: string;
  amount?: string;
  transactionDate?: string;
  description?: string;
}

function toFriendlyError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isUnauthorized) return 'Iltimos, qayta kiring.';
    if (error.isForbidden) return "Bu amalni bajarish uchun ruxsatingiz yo'q.";
    if (error.status === 404) return 'Xodim topilmadi.';
    if (error.isValidationError) {
      return error.message || "Ma'lumotlarni tekshirib, qayta urinib ko'ring.";
    }
    if (error.status === 0) return error.message;
    if (error.status >= 500) {
      return "Operatsiyani saqlab bo'lmadi. Qayta urinib ko'ring.";
    }
    return error.message || "Operatsiyani saqlab bo'lmadi. Qayta urinib ko'ring.";
  }
  return "Operatsiyani saqlab bo'lmadi. Qayta urinib ko'ring.";
}

/**
 * Admin-only create dialog for worker ledger rows.
 * Amount stays positive; type determines accounting effect on the backend.
 */
export function AddWorkerFinancialTransactionDialog({
  open,
  workerId,
  onClose,
  onCreated,
}: AddWorkerFinancialTransactionDialogProps) {
  const createTransaction = useCreateWorkerFinancialTransaction();
  const isPending = createTransaction.isPending;

  const [type, setType] = useState<WorkerFinancialCreatableType>(
    WorkerFinancialTransactionType.BONUS,
  );
  const [amount, setAmount] = useState(0);
  const [transactionDate, setTransactionDate] = useState(todayStoreInputDate);
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setType(WorkerFinancialTransactionType.BONUS);
    setAmount(0);
    setTransactionDate(todayStoreInputDate());
    setDescription('');
    setFieldErrors({});
    setFormError(null);
  }, [open]);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!type) next.type = 'Turni tanlang';
    if (!(amount > 0)) next.amount = "Summa 0 dan katta bo'lishi kerak";
    if (!transactionDate) next.transactionDate = 'Sanani tanlang';
    else if (!DATE_PATTERN.test(transactionDate)) {
      next.transactionDate = "Sana noto'g'ri";
    }
    if (description.trim().length > DESCRIPTION_MAX) {
      next.description = `Tavsif ${DESCRIPTION_MAX} belgidan oshmasligi kerak`;
    }
    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isPending) return;

    const nextErrors = validate();
    setFieldErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const body: CreateWorkerFinancialTransactionRequest = {
      workerId,
      type,
      amount,
      transactionDate,
      description: description.trim() || undefined,
    };

    try {
      await createTransaction.mutateAsync(body);
      onCreated?.();
      onClose();
    } catch (error) {
      if (error instanceof ApiClientError && error.isValidationError && error.details?.length) {
        const mapped: FieldErrors = {};
        for (const detail of error.details) {
          if (detail.field === 'type') mapped.type = detail.message;
          if (detail.field === 'amount') mapped.amount = detail.message;
          if (detail.field === 'transactionDate') mapped.transactionDate = detail.message;
          if (detail.field === 'description') mapped.description = detail.message;
        }
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
          return;
        }
      }
      setFormError(toFriendlyError(error));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isPending) onClose();
      }}
      title="Moliyaviy operatsiya qo'shish"
      description="Tez yozib qo'ying — summa musbat qoladi, ta'sirni turi belgilaydi."
      className="max-w-lg"
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="space-y-1.5">
          <label htmlFor="worker-finance-type" className="block text-sm font-medium text-ink">
            Turi
          </label>
          <select
            id="worker-finance-type"
            className={fieldClass}
            value={type}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.type)}
            onChange={(event) =>
              setType(event.target.value as WorkerFinancialCreatableType)
            }
          >
            {WORKER_FINANCE_CREATE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-muted">{WORKER_FINANCE_CREATE_TYPE_HELP[type]}</p>
          {fieldErrors.type ? (
            <p className="text-xs text-danger-600">{fieldErrors.type}</p>
          ) : null}
        </div>

        <MoneyField
          label="Summa"
          value={amount}
          onChange={setAmount}
          error={fieldErrors.amount}
          disabled={isPending}
        />

        <div className="space-y-1.5">
          <label htmlFor="worker-finance-date" className="block text-sm font-medium text-ink">
            Sana
          </label>
          <input
            id="worker-finance-date"
            type="date"
            value={transactionDate}
            onChange={(event) => setTransactionDate(event.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.transactionDate)}
            className={fieldClass}
          />
          {fieldErrors.transactionDate ? (
            <p className="text-xs text-danger-600">{fieldErrors.transactionDate}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="worker-finance-description"
            className="block text-sm font-medium text-ink"
          >
            Tavsif <span className="font-normal text-ink-muted">(ixtiyoriy)</span>
          </label>
          <textarea
            id="worker-finance-description"
            rows={3}
            value={description}
            maxLength={DESCRIPTION_MAX}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isPending}
            placeholder="Masalan: Avgust oyi uchun bonus"
            aria-invalid={Boolean(fieldErrors.description)}
            className={`${fieldClass} resize-y`}
          />
          {fieldErrors.description ? (
            <p className="text-xs text-danger-600">{fieldErrors.description}</p>
          ) : null}
        </div>

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
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
