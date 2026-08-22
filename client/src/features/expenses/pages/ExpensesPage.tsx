import { ExpenseStatus, type ExpenseListItem } from '@furniture-erp/shared';
import { Pencil, Plus, Search, Trash2, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { formatMoney } from '@/utils/format';

import { AddExpenseDialog } from '../components/AddExpenseDialog';
import { DeleteExpenseDialog } from '../components/DeleteExpenseDialog';
import { useExpenseCategories, useExpensesList } from '../hooks/use-expenses';
import { formatExpenseDay } from '../utils/date';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const PAGE_SIZE = 20;

type StatusFilter = typeof ExpenseStatus.ACTIVE | typeof ExpenseStatus.CANCELLED | 'ALL';

function listErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'You do not have permission to view expenses.';
    if (error.isUnauthorized) return 'Please sign in again.';
    if (error.status === 0) return error.message;
    return error.message || 'Try again.';
  }
  return 'Try again.';
}

function matchesSearch(expense: ExpenseListItem, search: string): boolean {
  if (!search) return true;
  const haystack = [
    expense.category.name,
    expense.description ?? '',
    expense.createdBy?.fullName ?? '',
    String(expense.amount),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(search);
}

function ExpenseActions({
  expense,
  onEdit,
  onCancel,
}: {
  expense: ExpenseListItem;
  onEdit: (expense: ExpenseListItem) => void;
  onCancel: (expense: ExpenseListItem) => void;
}) {
  if (expense.status === ExpenseStatus.CANCELLED) {
    return <Badge tone="danger">Bekor qilingan</Badge>;
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={() => onEdit(expense)}
        className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs font-medium text-ink hover:bg-surface-hover"
        aria-label={`Edit ${expense.category.name}`}
      >
        <Pencil className="size-3.5" aria-hidden="true" />
        Edit
      </button>
      <button
        type="button"
        onClick={() => onCancel(expense)}
        className="inline-flex items-center gap-1 rounded-input border border-danger-100 px-2 py-1 text-xs font-medium text-danger-700 hover:bg-danger-50"
        aria-label={`Cancel ${expense.category.name}`}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        Cancel
      </button>
    </div>
  );
}

export function ExpensesPage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ExpenseStatus.ACTIVE);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseListItem | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseListItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const list = useExpensesList({
    page: 1,
    pageSize: 100,
    status: statusFilter,
    categoryId: categoryId || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    search: search.trim() || undefined,
  });
  const categories = useExpenseCategories();

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const filtered = useMemo(() => {
    const items = list.data?.items ?? [];
    const needle = search.trim().toLowerCase();
    // Server already applies status/category/date/search; keep light client search for
    // typing latency while previous page data is shown.
    return items.filter((expense) => matchesSearch(expense, needle));
  }, [list.data?.items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Xarajatlar</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Do&apos;kon xarajatlarini tez va oson boshqaring.
          </p>
        </div>
        <WriteGuard
          feature="expenses"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700"
        >
          <Plus className="size-4" />
          Xarajat qo&apos;shish
        </WriteGuard>
      </div>

      {successMessage ? (
        <p
          role="status"
          className="rounded-input border border-success-100 bg-success-50 px-3 py-2 text-sm text-success-700"
        >
          {successMessage}
        </p>
      ) : null}

      <SectionCard title="Filtrlar">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
            <input
              className={`${fieldClass} pl-9`}
              placeholder="Qidirish: kategoriya, izoh, summa…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              aria-label="Search expenses"
            />
          </div>
          <select
            className={fieldClass}
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by category"
          >
            <option value="">Barcha kategoriyalar</option>
            {(categories.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className={fieldClass}
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value={ExpenseStatus.ACTIVE}>Faol</option>
            <option value={ExpenseStatus.CANCELLED}>Bekor qilingan</option>
            <option value="ALL">Barchasi</option>
          </select>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-muted">Dan</span>
            <input
              type="date"
              className={fieldClass}
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
              aria-label="From date"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-muted">Gacha</span>
            <input
              type="date"
              className={fieldClass}
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
              aria-label="To date"
            />
          </label>
        </div>
      </SectionCard>

      {list.isError ? (
        <ErrorState
          title="Xarajatlarni yuklab bo'lmadi"
          message={listErrorMessage(list.error)}
          onRetry={() => void list.refetch()}
        />
      ) : null}

      {list.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : null}

      {!list.isLoading && !list.isError && filtered.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Xarajatlar yo'q"
          description={
            search || categoryId || fromDate || toDate || statusFilter !== ExpenseStatus.ACTIVE
              ? 'Filtrlarga mos xarajat topilmadi.'
              : "Birinchi xarajatni qo'shing — elektr, ijara, transport va boshqalar."
          }
          action={
            !search &&
            !categoryId &&
            !fromDate &&
            !toDate &&
            statusFilter === ExpenseStatus.ACTIVE ? (
              <WriteGuard
                feature="expenses"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Plus className="size-4" />
                Xarajat qo&apos;shish
              </WriteGuard>
            ) : undefined
          }
        />
      ) : null}

      {!list.isLoading && !list.isError && pageItems.length > 0 ? (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {pageItems.map((expense) => (
              <article
                key={expense.id}
                className="rounded-panel border border-line bg-surface p-4 shadow-card"
                data-expense-id={expense.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{expense.category.name}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {formatExpenseDay(expense.expenseDate)}
                    </p>
                  </div>
                  <p className="tabular-money shrink-0 text-sm font-semibold text-ink">
                    {formatMoney(expense.amount)}
                  </p>
                </div>
                {expense.description ? (
                  <p className="mt-2 text-sm text-ink-soft">{expense.description}</p>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Badge tone="neutral">{expense.createdBy?.fullName ?? '—'}</Badge>
                  <ExpenseActions
                    expense={expense}
                    onEdit={setEditingExpense}
                    onCancel={setDeletingExpense}
                  />
                </div>
              </article>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-panel border border-line bg-surface shadow-card md:block">
            <table className="min-w-[780px] w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-xs tracking-wide text-ink-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Sana</th>
                  <th className="px-4 py-3 font-medium">Kategoriya</th>
                  <th className="px-4 py-3 font-medium">Izoh</th>
                  <th className="px-4 py-3 font-medium text-right">Summa</th>
                  <th className="px-4 py-3 font-medium">Kiritgan</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((expense) => (
                  <tr
                    key={expense.id}
                    className={`border-b border-line last:border-0 ${
                      expense.status === ExpenseStatus.CANCELLED ? 'opacity-70' : ''
                    }`}
                    data-expense-id={expense.id}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                      {formatExpenseDay(expense.expenseDate)}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{expense.category.name}</td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-ink-soft">
                      {expense.description || '—'}
                    </td>
                    <td className="tabular-money px-4 py-3 text-right font-medium text-ink">
                      {formatMoney(expense.amount)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {expense.createdBy?.fullName ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <ExpenseActions
                          expense={expense}
                          onEdit={setEditingExpense}
                          onCancel={setDeletingExpense}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-muted">
                Sahifa {safePage} / {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-input border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={safePage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Oldingi
                </button>
                <button
                  type="button"
                  className="rounded-input border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Keyingi
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <AddExpenseDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setSuccessMessage("Xarajat saqlandi.")}
      />

      <AddExpenseDialog
        open={Boolean(editingExpense)}
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onUpdated={() => setSuccessMessage('Xarajat yangilandi.')}
      />

      <DeleteExpenseDialog
        open={Boolean(deletingExpense)}
        expense={deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onDeleted={() => setSuccessMessage('Xarajat bekor qilindi.')}
      />
    </PageContainer>
  );
}
