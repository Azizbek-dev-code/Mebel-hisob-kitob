import {
  PLATFORM_EXPENSE_CATEGORIES,
  PLATFORM_EXPENSE_CATEGORY_LABELS,
  PlatformExpenseCategory,
  PlatformExpenseStatus,
  formatMoney,
  type CreatePlatformExpenseBody,
  type PlatformExpenseDto,
} from '@furniture-erp/shared';
import { Loader2, Plus, Wallet } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { ApiClientError } from '@/lib/api-client';
import { formatDate } from '@/utils/format';

import {
  useCancelPlatformExpense,
  useCreatePlatformExpense,
  usePlatformExpenses,
  useUpdatePlatformExpense,
} from '../hooks/use-platform-billing';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export function PlatformExpensesPage() {
  const list = usePlatformExpenses();
  const cancel = useCancelPlatformExpense();
  const [editing, setEditing] = useState<PlatformExpenseDto | null | 'new'>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">Platforma xarajatlari</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Bu do&apos;kon xarajatlari emas — faqat platforma darajasidagi xarajatlar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white"
        >
          <Plus className="size-4" />
          Xarajat
        </button>
      </div>

      {notice ? (
        <p role="status" className="text-sm text-success-700">
          {notice}
        </p>
      ) : null}

      <SectionCard title="Ro'yxat">
        {list.isPending && !list.data ? (
          <Skeleton className="h-24 w-full" />
        ) : list.isError ? (
          <ErrorState
            title="Xarajatlarni yuklab bo'lmadi"
            message="Qayta urinib ko'ring."
            onRetry={() => void list.refetch()}
          />
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={Wallet} title="Xarajat yo'q" description="Platforma xarajatini qo'shing." />
        ) : (
          <ul className="divide-y divide-line">
            {list.data?.items.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {PLATFORM_EXPENSE_CATEGORY_LABELS[row.category]} · {formatMoney(row.amount)}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {formatDate(row.date)}
                    {row.vendor ? ` · ${row.vendor}` : ''}
                    {row.description ? ` · ${row.description}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={row.status === PlatformExpenseStatus.CANCELLED ? 'danger' : 'success'}>
                    {row.status === PlatformExpenseStatus.CANCELLED ? 'Bekor' : 'Faol'}
                  </Badge>
                  {row.status !== PlatformExpenseStatus.CANCELLED ? (
                    <>
                      <button
                        type="button"
                        className="text-xs font-medium hover:underline"
                        onClick={() => setEditing(row)}
                      >
                        Tahrirlash
                      </button>
                      <button
                        type="button"
                        className="text-xs font-medium text-danger-700 hover:underline"
                        onClick={() => {
                          if (!window.confirm('Xarajat bekor qilinsinmi?')) return;
                          void cancel.mutateAsync(row.id).then(() => setNotice('Xarajat bekor qilindi'));
                        }}
                      >
                        Bekor qilish
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {editing ? (
        <ExpenseDialog
          expense={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setNotice('Saqlandi')}
        />
      ) : null}
    </PageContainer>
  );
}

function ExpenseDialog({
  expense,
  onClose,
  onSaved,
}: {
  expense: PlatformExpenseDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const create = useCreatePlatformExpense();
  const update = useUpdatePlatformExpense();
  const [category, setCategory] = useState(expense?.category ?? PlatformExpenseCategory.OTHER);
  const [amount, setAmount] = useState(expense?.amount ?? 0);
  const [date, setDate] = useState(expense ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState(expense?.description ?? '');
  const [vendor, setVendor] = useState(expense?.vendor ?? '');
  const [reference, setReference] = useState(expense?.reference ?? '');
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const body: CreatePlatformExpenseBody = {
      category,
      amount,
      date: new Date(`${date}T12:00:00`).toISOString(),
      description: description.trim() || undefined,
      vendor: vendor.trim() || undefined,
      reference: reference.trim() || undefined,
    };
    try {
      if (expense) await update.mutateAsync({ id: expense.id, body });
      else await create.mutateAsync(body);
      onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : 'Saqlab bo‘lmadi');
    }
  }

  return (
    <Dialog open title={expense ? 'Xarajatni tahrirlash' : 'Yangi xarajat'} onClose={onClose}>
      <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Kategoriya</span>
          <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
            {PLATFORM_EXPENSE_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {PLATFORM_EXPENSE_CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <MoneyField label="Summa" value={amount} onChange={setAmount} />
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Sana</span>
          <input type="date" className={fieldClass} value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Yetkazuvchi</span>
          <input className={fieldClass} value={vendor} onChange={(event) => setVendor(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Reference</span>
          <input className={fieldClass} value={reference} onChange={(event) => setReference(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Tavsif</span>
          <textarea className={fieldClass} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-danger-700">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-input px-3 py-2 text-sm" onClick={onClose}>
            Bekor
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Saqlash
          </button>
        </div>
      </form>
    </Dialog>
  );
}
