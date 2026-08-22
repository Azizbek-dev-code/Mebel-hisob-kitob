import type {
  CreateExpenseRequest,
  ExpenseCategoryItem,
  ExpenseListItem,
  UpdateExpenseRequest,
} from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { SearchSelect, type SearchSelectOption } from '@/features/sales/components/SearchSelect';
import { ApiClientError } from '@/lib/api-client';

import {
  useCreateExpense,
  useExpenseCategories,
  useUpdateExpense,
} from '../hooks/use-expenses';
import { toInputDate, todayInputDate } from '../utils/date';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

const DESCRIPTION_MAX = 1000;

interface AddExpenseDialogProps {
  open: boolean;
  onClose: () => void;
  /** When set, the dialog edits this expense instead of creating a new one. */
  expense?: ExpenseListItem | null;
  onCreated?: () => void;
  onUpdated?: () => void;
}

interface FieldErrors {
  categoryId?: string;
  amount?: string;
  expenseDate?: string;
  description?: string;
}

function toFriendlyError(error: unknown, mode: 'create' | 'edit'): string {
  if (error instanceof ApiClientError) {
    if (error.isUnauthorized) return 'Please sign in again.';
    if (error.isForbidden) return 'You do not have permission to manage expenses.';
    if (error.isValidationError) return error.message || 'Check the form and try again.';
    if (error.status === 0) return error.message;
    if (error.status >= 500) return 'Something went wrong on the server. Try again.';
    return error.message || (mode === 'edit' ? 'Could not update the expense.' : 'Could not save the expense.');
  }
  return mode === 'edit' ? 'Could not update the expense.' : 'Could not save the expense.';
}

/**
 * Shared create/edit expense dialog.
 * Create mode when `expense` is null/undefined; edit mode when an expense is provided.
 */
export function AddExpenseDialog({
  open,
  onClose,
  expense = null,
  onCreated,
  onUpdated,
}: AddExpenseDialogProps) {
  const isEdit = Boolean(expense);
  const categories = useExpenseCategories(open);
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const isPending = createExpense.isPending || updateExpense.isPending;

  const [category, setCategory] = useState<SearchSelectOption | null>(null);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [amount, setAmount] = useState(0);
  const [expenseDate, setExpenseDate] = useState(todayInputDate);
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCategoryQuery('');
    setFieldErrors({});
    setFormError(null);

    if (expense) {
      setCategory({ id: expense.category.id, label: expense.category.name });
      setAmount(expense.amount);
      setExpenseDate(toInputDate(expense.expenseDate));
      setDescription(expense.description ?? '');
    } else {
      setCategory(null);
      setAmount(0);
      setExpenseDate(todayInputDate());
      setDescription('');
    }
  }, [open, expense]);

  const categoryOptions = useMemo(() => {
    const items = (categories.data ?? []).filter((item) => item.isActive);
    const query = categoryQuery.trim().toLowerCase();
    const filtered = query
      ? items.filter((item) => item.name.toLowerCase().includes(query))
      : items;
    return filtered.map((item: ExpenseCategoryItem) => ({
      id: item.id,
      label: item.name,
    }));
  }, [categories.data, categoryQuery]);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!category) next.categoryId = 'Kategoriyani tanlang';
    if (!(amount > 0)) next.amount = "Summa 0 dan katta bo'lishi kerak";
    if (!expenseDate) next.expenseDate = 'Sanani tanlang';
    if (description.trim().length > DESCRIPTION_MAX) {
      next.description = `Izoh ${DESCRIPTION_MAX} belgidan oshmasligi kerak`;
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

    try {
      if (isEdit && expense) {
        const body: UpdateExpenseRequest = {
          categoryId: category!.id,
          amount,
          expenseDate,
          description: description.trim() ? description.trim() : null,
        };
        await updateExpense.mutateAsync({ id: expense.id, body });
        onUpdated?.();
      } else {
        const body: CreateExpenseRequest = {
          categoryId: category!.id,
          amount,
          expenseDate,
          description: description.trim() || undefined,
        };
        await createExpense.mutateAsync(body);
        onCreated?.();
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiClientError && error.isValidationError && error.details?.length) {
        const mapped: FieldErrors = {};
        for (const detail of error.details) {
          if (detail.field === 'categoryId') mapped.categoryId = detail.message;
          if (detail.field === 'amount') mapped.amount = detail.message;
          if (detail.field === 'expenseDate') mapped.expenseDate = detail.message;
          if (detail.field === 'description') mapped.description = detail.message;
        }
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
          return;
        }
      }
      setFormError(toFriendlyError(error, isEdit ? 'edit' : 'create'));
    }
  }

  const dateFieldId = isEdit ? 'expense-edit-date' : 'expense-date';
  const descriptionFieldId = isEdit ? 'expense-edit-description' : 'expense-description';

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isPending) onClose();
      }}
      title={isEdit ? 'Xarajatni tahrirlash' : "Xarajat qo'shish"}
      description={
        isEdit
          ? "O'zgarishlar moliyaviy hisobotlarga ham ta'sir qiladi."
          : "Tez yozib qo'ying — keyin yana qo'sha olasiz."
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <SearchSelect
          label="Kategoriya"
          placeholder="Kategoriya qidirish…"
          value={category}
          options={categoryOptions}
          isLoading={categories.isLoading}
          query={categoryQuery}
          onQueryChange={setCategoryQuery}
          onChange={setCategory}
          error={fieldErrors.categoryId}
          disabled={isPending}
          emptyMessage="Kategoriya topilmadi"
        />

        <MoneyField
          label="Summa"
          value={amount}
          onChange={setAmount}
          error={fieldErrors.amount}
          disabled={isPending}
        />

        <div className="space-y-1.5">
          <label htmlFor={dateFieldId} className="block text-sm font-medium text-ink">
            Sana
          </label>
          <input
            id={dateFieldId}
            type="date"
            value={expenseDate}
            onChange={(event) => setExpenseDate(event.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.expenseDate)}
            className={fieldClass}
          />
          {fieldErrors.expenseDate ? (
            <p className="text-xs text-danger-600">{fieldErrors.expenseDate}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor={descriptionFieldId} className="block text-sm font-medium text-ink">
            Izoh <span className="font-normal text-ink-muted">(ixtiyoriy)</span>
          </label>
          <textarea
            id={descriptionFieldId}
            rows={3}
            value={description}
            maxLength={DESCRIPTION_MAX}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isPending}
            placeholder="Qisqa izoh…"
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
            Saqlash
          </button>
        </div>
      </form>
    </Dialog>
  );
}
