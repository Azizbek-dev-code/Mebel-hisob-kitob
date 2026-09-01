import {
  CustomerStatus,
  UserRole,
  type CustomerDebtFilter,
  type CustomerListItem,
  type CustomerListStatusFilter,
} from '@furniture-erp/shared';
import {
  AlertTriangle,
  Archive,
  Eye,
  Pencil,
  Plus,
  Search,
  Users,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatMoney } from '@/utils/format';

import { CustomerFormDialog } from '../components/CustomerFormDialog';
import {
  useArchiveCustomer,
  useCustomersList,
  useRestoreCustomer,
} from '../hooks/use-customers';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const PAGE_SIZE = 20;

function listErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return t('customers.forbidden');
    return error.message || t('common.retry');
  }
  return t('common.retry');
}

function debtTone(status: CustomerListItem['debtStatus']): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'OVERDUE') return 'danger';
  if (status === 'IN_DEBT') return 'warning';
  return 'success';
}

function canArchiveRole(role: string | undefined): boolean {
  return role === UserRole.ADMIN || role === UserRole.PLATFORM_ADMIN;
}

export function CustomersPage() {
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const isAdmin = canArchiveRole(currentUser?.role);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<CustomerListStatusFilter>(CustomerStatus.ACTIVE);
  const [debtFilter, setDebtFilter] = useState<CustomerDebtFilter>('ALL');
  const [sort, setSort] = useState<'name' | 'debt' | 'lastSale'>('name');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerListItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const archiveCustomer = useArchiveCustomer();
  const restoreCustomer = useRestoreCustomer();

  function debtLabel(debtStatus: CustomerListItem['debtStatus']): string {
    if (debtStatus === 'OVERDUE') return t('customers.overdue');
    if (debtStatus === 'IN_DEBT') return t('customers.debtor');
    return t('customers.clear');
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, debtFilter, sort]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const query = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status,
      debtFilter: debtFilter === 'ALL' ? undefined : debtFilter,
      sort,
    }),
    [page, debouncedSearch, status, debtFilter, sort],
  );

  const list = useCustomersList(query);
  const summary = list.data?.summary;
  const items = list.data?.items ?? [];
  const meta = list.data?.meta;

  async function handleArchive(customer: CustomerListItem) {
    if (!window.confirm(t('customers.archiveConfirm', { name: customer.fullName }))) return;
    try {
      await archiveCustomer.mutateAsync(customer.id);
      setMessage(t('customers.archivedMessage'));
    } catch (error) {
      setMessage(listErrorMessage(error, t));
    }
  }

  async function handleRestore(customer: CustomerListItem) {
    try {
      await restoreCustomer.mutateAsync(customer.id);
      setMessage(t('customers.restoredMessage'));
    } catch (error) {
      setMessage(listErrorMessage(error, t));
    }
  }

  return (
    <PageContainer className="space-y-6">
      <div data-testid="customers-page" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('customers.title')}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t('customers.subtitle')}</p>
          </div>
          <WriteGuard
            feature="customers"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t('customers.new')}
          </WriteGuard>
        </div>

        {message ? (
          <p className="rounded-input border border-line bg-surface-muted px-3 py-2 text-sm text-ink">
            {message}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={t('customers.totalCustomers')}
            value={summary ? String(summary.totalCustomers) : '—'}
            context={t('customers.totalCustomersHint')}
            icon={Users}
            isLoading={list.isLoading}
          />
          <KpiCard
            title={t('customers.inDebt')}
            value={summary ? String(summary.customersInDebt) : '—'}
            context={t('customers.inDebtHint')}
            icon={Wallet}
            tone="warning"
            isLoading={list.isLoading}
          />
          <KpiCard
            title={t('customers.totalDebt')}
            value={summary ? formatMoney(summary.totalOutstanding) : '—'}
            context="ACTIVE|COMPLETED"
            icon={Wallet}
            tone="warning"
            isLoading={list.isLoading}
          />
          <KpiCard
            title={t('customers.overdueDebt')}
            value={summary ? formatMoney(summary.overdueAmount) : '—'}
            context={t('customers.overdueHint')}
            icon={AlertTriangle}
            tone="danger"
            isLoading={list.isLoading}
          />
        </div>

        <SectionCard title={t('common.filters')} description={t('customers.filtersHint')}>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                className={cn(fieldClass, 'pl-9')}
                placeholder={t('customers.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="customers-search"
              />
            </div>

            <div className="flex flex-wrap gap-1" role="group" aria-label={t('common.status')}>
              {(
                [
                  [CustomerStatus.ACTIVE, t('common.active')],
                  [CustomerStatus.ARCHIVED, t('common.archived')],
                  ['ALL', t('common.all')],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatus(id)}
                  className={cn(
                    'rounded-[0.4rem] px-2.5 py-1.5 text-xs font-medium sm:text-sm',
                    status === id
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-soft hover:bg-surface-hover',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1" role="group" aria-label={t('customers.debtFilter')}>
              {(
                [
                  ['ALL', t('customers.debtAll')],
                  ['CLEAR', t('customers.clear')],
                  ['IN_DEBT', t('customers.debtor')],
                  ['OVERDUE', t('customers.overdue')],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDebtFilter(id)}
                  className={cn(
                    'rounded-[0.4rem] px-2.5 py-1.5 text-xs font-medium sm:text-sm',
                    debtFilter === id
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-soft hover:bg-surface-hover',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              className={cn(fieldClass, 'max-w-xs')}
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              aria-label={t('customers.sortByName')}
            >
              <option value="name">{t('customers.sortByName')}</option>
              <option value="debt">{t('customers.sortByDebt')}</option>
              <option value="lastSale">{t('customers.sortByLastSale')}</option>
            </select>
          </div>
        </SectionCard>

        {list.isError ? (
          <ErrorState
            title={t('customers.loadFailed')}
            message={listErrorMessage(list.error, t)}
            onRetry={() => void list.refetch()}
          />
        ) : list.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('customers.emptyTitle')}
            description={t('customers.emptyDescription')}
          />
        ) : (
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-muted text-xs text-ink-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('customers.fullName')}</th>
                  <th className="px-3 py-2 font-medium">{t('common.phone')}</th>
                  <th className="px-3 py-2 font-medium">{t('customers.totalPurchases')}</th>
                  <th className="px-3 py-2 font-medium">{t('customers.paid')}</th>
                  <th className="px-3 py-2 font-medium">{t('customers.debt')}</th>
                  <th className="px-3 py-2 font-medium">{t('customers.overdue')}</th>
                  <th className="px-3 py-2 font-medium">{t('customers.lastSale')}</th>
                  <th className="px-3 py-2 font-medium">{t('common.status')}</th>
                  <th className="px-3 py-2 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((customer) => (
                  <tr key={customer.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 font-medium text-ink">{customer.fullName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-ink-soft">{customer.phone}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatMoney(customer.totalPurchases)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatMoney(customer.totalPaid)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatMoney(customer.outstandingDebt)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatMoney(customer.overdueAmount)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-ink-soft">
                      {customer.lastSaleAt ? formatDate(customer.lastSaleAt) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={debtTone(customer.debtStatus)}>
                          {debtLabel(customer.debtStatus)}
                        </Badge>
                        {customer.status === CustomerStatus.ARCHIVED ? (
                          <Badge tone="neutral">{t('common.archived')}</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Link
                          to={ROUTES.customerDetail(customer.id)}
                          className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs hover:bg-surface-hover"
                        >
                          <Eye className="size-3.5" />
                          {t('common.view')}
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(customer);
                            setFormOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs hover:bg-surface-hover"
                        >
                          <Pencil className="size-3.5" />
                          {t('common.edit')}
                        </button>
                        {isAdmin ? (
                          customer.status === CustomerStatus.ACTIVE ? (
                            <button
                              type="button"
                              onClick={() => void handleArchive(customer)}
                              className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"
                            >
                              <Archive className="size-3.5" />
                              {t('common.archive')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleRestore(customer)}
                              className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs hover:bg-surface-hover"
                            >
                              {t('common.restore')}
                            </button>
                          )
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">
              {t('common.pageOf', { page: meta.page, total: meta.totalPages })}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-input border border-line px-2 py-1 disabled:opacity-50"
              >
                {t('common.previous')}
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-input border border-line px-2 py-1 disabled:opacity-50"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <CustomerFormDialog
        mode={editing ? 'edit' : 'create'}
        customer={editing}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() =>
          setMessage(editing ? t('customers.updatedMessage') : t('customers.createdMessage'))
        }
      />
    </PageContainer>
  );
}
