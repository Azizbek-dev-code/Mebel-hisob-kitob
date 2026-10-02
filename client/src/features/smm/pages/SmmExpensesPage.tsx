import { ExpenseStatus, type ExpenseListItem } from '@furniture-erp/shared';
import { Pencil, Plus, Search, Tags, Trash2, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { AddExpenseDialog } from '@/features/expenses/components/AddExpenseDialog';
import { DeleteExpenseDialog } from '@/features/expenses/components/DeleteExpenseDialog';
import { useExpenseCategories, useExpensesList } from '@/features/expenses/hooks/use-expenses';
import { formatExpenseDay } from '@/features/expenses/utils/date';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/utils/format';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const PAGE_SIZE = 20;

type StatusFilter = typeof ExpenseStatus.ACTIVE | typeof ExpenseStatus.CANCELLED | 'ALL';
type TabKey = 'overview' | 'list' | 'categories';

function listErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return t('expenses.forbidden');
    if (error.isUnauthorized) return t('expenses.signInAgain');
    if (error.status === 0) return error.message;
    return error.message || t('common.retry');
  }
  return t('common.retry');
}

export function SmmExpensesPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('overview');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ExpenseStatus.ACTIVE);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseListItem | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseListItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const list = useExpensesList({
    page,
    pageSize: PAGE_SIZE,
    status: statusFilter,
    categoryId: categoryId || undefined,
    search: search.trim() || undefined,
  });
  const categories = useExpenseCategories();

  const overviewList = useExpensesList({
    page: 1,
    pageSize: 100,
    status: ExpenseStatus.ACTIVE,
  });

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const pageItems = list.data?.items ?? [];
  const meta = list.data?.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const isEmpty = pageItems.length === 0;

  const overviewTotals = useMemo(() => {
    const items = overviewList.data?.items ?? [];
    const total = items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
    const byCategory = new Map<string, { name: string; total: number; count: number }>();
    for (const item of items) {
      const key = item.category.id;
      const prev = byCategory.get(key) ?? { name: item.category.name, total: 0, count: 0 };
      prev.total += Number(item.amount ?? 0);
      prev.count += 1;
      byCategory.set(key, prev);
    }
    return {
      count: overviewList.data?.meta?.totalItems ?? items.length,
      total,
      categories: [...byCategory.values()].sort((a, b) => b.total - a.total),
    };
  }, [overviewList.data]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: t('smm.expensesOverview') },
    { key: 'list', label: t('smm.expensesList') },
    { key: 'categories', label: t('smm.expensesCategories') },
  ];

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('smm.expensesTitle')}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t('smm.expensesSubtitle')}</p>
        </div>
        <WriteGuard
          feature="expenses"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700"
        >
          <Plus className="size-4" />
          {t('expenses.add')}
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

      <nav className="-mx-1 max-w-full overflow-x-auto">
        <div className="flex w-max min-w-full gap-1 rounded-input border border-line bg-surface-muted p-1">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                'shrink-0 rounded-[0.4rem] px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                tab === item.key
                  ? 'bg-surface text-brand-700 shadow-card'
                  : 'text-ink-soft hover:bg-surface-hover hover:text-ink',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {tab === 'overview' ? (
        overviewList.isError ? (
          <ErrorState
            title={t('expenses.loadFailed')}
            message={listErrorMessage(overviewList.error, t)}
            onRetry={() => void overviewList.refetch()}
          />
        ) : overviewList.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <SectionCard title={t('smm.expensesTotal')}>
                <p className="tabular-money text-2xl font-semibold text-ink">
                  {formatMoney(overviewTotals.total)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {t('smm.expensesActiveCount', { count: overviewTotals.count })}
                </p>
              </SectionCard>
              <SectionCard title={t('smm.expensesTopCategories')}>
                {overviewTotals.categories.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t('expenses.emptyHint')}</p>
                ) : (
                  <ul className="space-y-2">
                    {overviewTotals.categories.slice(0, 5).map((row) => (
                      <li key={row.name} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate text-ink">{row.name}</span>
                        <span className="tabular-money shrink-0 font-medium text-ink">
                          {formatMoney(row.total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
            {overviewTotals.count === 0 ? (
              <EmptyState
                icon={Wallet}
                title={t('expenses.emptyTitle')}
                description={t('expenses.emptyHint')}
                action={
                  <WriteGuard
                    feature="expenses"
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    <Plus className="size-4" />
                    {t('expenses.add')}
                  </WriteGuard>
                }
              />
            ) : null}
          </div>
        )
      ) : null}

      {tab === 'categories' ? (
        categories.isError ? (
          <ErrorState
            title={t('expenses.loadFailed')}
            message={listErrorMessage(categories.error, t)}
            onRetry={() => void categories.refetch()}
          />
        ) : categories.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (categories.data ?? []).length === 0 ? (
          <EmptyState
            icon={Tags}
            title={t('smm.expensesNoCategories')}
            description={t('smm.expensesNoCategoriesHint')}
          />
        ) : (
          <SectionCard title={t('smm.expensesCategories')}>
            <ul className="divide-y divide-line">
              {(categories.data ?? []).map((category) => (
                <li key={category.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="font-medium text-ink">{category.name}</span>
                  <button
                    type="button"
                    className="text-brand-700 hover:underline"
                    onClick={() => {
                      setCategoryId(category.id);
                      setTab('list');
                      setPage(1);
                    }}
                  >
                    {t('smm.expensesViewInList')}
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>
        )
      ) : null}

      {tab === 'list' ? (
        <>
          <SectionCard title={t('common.filters')}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
                <input
                  className={`${fieldClass} pl-9`}
                  placeholder={t('expenses.searchPlaceholder')}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  aria-label={t('common.search')}
                />
              </div>
              <select
                className={fieldClass}
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setPage(1);
                }}
                aria-label={t('expenses.category')}
              >
                <option value="">{t('common.allCategories')}</option>
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
                aria-label={t('common.status')}
              >
                <option value={ExpenseStatus.ACTIVE}>{t('common.active')}</option>
                <option value={ExpenseStatus.CANCELLED}>{t('expenses.cancelledBadge')}</option>
                <option value="ALL">{t('common.all')}</option>
              </select>
            </div>
          </SectionCard>

          {list.isError ? (
            <ErrorState
              title={t('expenses.loadFailed')}
              message={listErrorMessage(list.error, t)}
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

          {!list.isLoading && !list.isError && isEmpty ? (
            <EmptyState
              icon={Wallet}
              title={t('expenses.emptyTitle')}
              description={
                search || categoryId || statusFilter !== ExpenseStatus.ACTIVE
                  ? t('expenses.emptyFiltered')
                  : t('expenses.emptyHint')
              }
            />
          ) : null}

          {!list.isLoading && !list.isError && pageItems.length > 0 ? (
            <>
              <ul className="space-y-3">
                {pageItems.map((expense) => (
                  <li
                    key={expense.id}
                    className="flex flex-col gap-2 rounded-panel border border-line bg-surface p-3 shadow-card sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{expense.category.name}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {formatExpenseDay(expense.expenseDate)}
                        {expense.description ? ` · ${expense.description}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <p className="tabular-money font-semibold text-ink">
                        {formatMoney(expense.amount)}
                      </p>
                      {expense.status === ExpenseStatus.CANCELLED ? (
                        <Badge tone="danger">{t('expenses.cancelledBadge')}</Badge>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingExpense(expense)}
                            className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs font-medium text-ink hover:bg-surface-hover"
                          >
                            <Pencil className="size-3.5" />
                            {t('common.edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingExpense(expense)}
                            className="inline-flex items-center gap-1 rounded-input border border-danger-100 px-2 py-1 text-xs font-medium text-danger-700 hover:bg-danger-50"
                          >
                            <Trash2 className="size-3.5" />
                            {t('common.cancel')}
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {totalPages > 1 ? (
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="rounded-input border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    {t('common.back')}
                  </button>
                  <p className="text-sm text-ink-muted">
                    {page} / {totalPages}
                  </p>
                  <button
                    type="button"
                    className="rounded-input border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    {t('common.continue')}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      <AddExpenseDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setSuccessMessage(t('expenses.saved'))}
      />
      <AddExpenseDialog
        open={Boolean(editingExpense)}
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onUpdated={() => setSuccessMessage(t('expenses.updated'))}
      />
      <DeleteExpenseDialog
        open={Boolean(deletingExpense)}
        expense={deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onDeleted={() => setSuccessMessage(t('expenses.cancelled'))}
      />
    </PageContainer>
  );
}
