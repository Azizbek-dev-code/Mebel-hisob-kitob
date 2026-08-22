import {
  SupplierStatus,
  UserRole,
  type SupplierListItem,
  type SupplierListStatusFilter,
} from '@furniture-erp/shared';
import { Archive, Eye, Pencil, Plus, Search, Truck, Users, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatMoney } from '@/utils/format';

import { SupplierFormDialog } from '../components/SupplierFormDialog';
import {
  useArchiveSupplier,
  useRestoreSupplier,
  useSuppliersList,
} from '../hooks/use-purchasing';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const PAGE_SIZE = 20;

type DebtFilter = 'ALL' | 'CLEAR' | 'IN_DEBT';

function listErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'Yetkazuvchilar ro‘yxatini ko‘rish uchun ruxsat yo‘q.';
    return error.message || 'Qayta urinib ko‘ring.';
  }
  return 'Qayta urinib ko‘ring.';
}

function canArchiveRole(role: string | undefined): boolean {
  return role === UserRole.ADMIN || role === UserRole.PLATFORM_ADMIN;
}

export function SuppliersPage() {
  const { data: currentUser } = useCurrentUser();
  const isAdmin = canArchiveRole(currentUser?.role);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<SupplierListStatusFilter>(SupplierStatus.ACTIVE);
  const [debtFilter, setDebtFilter] = useState<DebtFilter>('ALL');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierListItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const archiveSupplier = useArchiveSupplier();
  const restoreSupplier = useRestoreSupplier();

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, debtFilter]);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(t);
  }, [message]);

  const query = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status,
      debtFilter: debtFilter === 'ALL' ? undefined : debtFilter,
    }),
    [page, debouncedSearch, status, debtFilter],
  );

  const list = useSuppliersList(query);
  const summary = list.data?.summary;
  const items = list.data?.items ?? [];
  const meta = list.data?.meta;

  async function handleArchive(supplier: SupplierListItem) {
    if (!window.confirm(`“${supplier.name}” ni arxivlashni tasdiqlaysizmi?`)) return;
    try {
      await archiveSupplier.mutateAsync(supplier.id);
      setMessage('Yetkazuvchi arxivlandi — yangi kirimlarda chiqmaydi.');
    } catch (error) {
      setMessage(listErrorMessage(error));
    }
  }

  async function handleRestore(supplier: SupplierListItem) {
    try {
      await restoreSupplier.mutateAsync(supplier.id);
      setMessage('Yetkazuvchi yana faol.');
    } catch (error) {
      setMessage(listErrorMessage(error));
    }
  }

  return (
    <PageContainer className="space-y-6">
      <div data-testid="suppliers-page" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Yetkazuvchilar</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Yetkazuvchilar, kirimlar va supplier qarzi — hisob kitobdan.
            </p>
          </div>
          <WriteGuard
            feature="suppliers"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="size-4" aria-hidden="true" />
            Yangi yetkazuvchi
          </WriteGuard>
        </div>

        {message ? (
          <p className="rounded-input border border-line bg-surface-muted px-3 py-2 text-sm text-ink">
            {message}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Jami"
            value={summary ? String(summary.totalSuppliers) : '—'}
            context="Faol + arxiv"
            icon={Users}
            isLoading={list.isLoading}
          />
          <KpiCard
            title="Faol"
            value={summary ? String(summary.activeCount) : '—'}
            context="Faol yetkazuvchilar"
            icon={Truck}
            isLoading={list.isLoading}
          />
          <KpiCard
            title="Qarzimiz bor"
            value={summary ? String(summary.suppliersInDebt) : '—'}
            context="Ochiq qarzli"
            icon={Wallet}
            tone="warning"
            isLoading={list.isLoading}
          />
          <KpiCard
            title="Jami supplier qarzi"
            value={summary ? formatMoney(summary.totalOutstanding) : '—'}
            context="ACTIVE kirimlar"
            icon={Wallet}
            tone="warning"
            isLoading={list.isLoading}
          />
        </div>

        <SectionCard title="Filtrlar" description="Qidiruv, holat va qarz">
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                className={cn(fieldClass, 'pl-9')}
                placeholder="Nomi yoki telefon"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="suppliers-search"
              />
            </div>

            <div className="flex flex-wrap gap-1" role="group" aria-label="Holat">
              {(
                [
                  [SupplierStatus.ACTIVE, 'Faol'],
                  [SupplierStatus.ARCHIVED, 'Arxiv'],
                  ['ALL', 'Hammasi'],
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

            <div className="flex flex-wrap gap-1" role="group" aria-label="Qarz">
              {(
                [
                  ['ALL', 'Qarz: hammasi'],
                  ['CLEAR', 'Qarzi yo‘q'],
                  ['IN_DEBT', 'Qarzimiz bor'],
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
          </div>
        </SectionCard>

        {list.isError ? (
          <ErrorState
            title="Yetkazuvchilarni yuklab bo‘lmadi"
            message={listErrorMessage(list.error)}
            onRetry={() => void list.refetch()}
          />
        ) : list.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="Yetkazuvchi topilmadi"
            description="Yangi yetkazuvchi qo‘shing yoki filtrni o‘zgartiring."
          />
        ) : (
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-muted text-xs text-ink-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Nomi</th>
                  <th className="px-3 py-2 font-medium">Telefon</th>
                  <th className="px-3 py-2 font-medium">Jami kirim</th>
                  <th className="px-3 py-2 font-medium">To‘langan</th>
                  <th className="px-3 py-2 font-medium">Qarz</th>
                  <th className="px-3 py-2 font-medium">Ochiq</th>
                  <th className="px-3 py-2 font-medium">Oxirgi kirim</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {items.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 font-medium text-ink">{supplier.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-ink-soft">
                      {supplier.phone ?? '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatMoney(supplier.totalPurchases)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatMoney(supplier.totalPaid)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatMoney(supplier.outstandingDebt)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{supplier.openPurchaseCount}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-ink-soft">
                      {supplier.lastPurchaseAt ? formatDate(supplier.lastPurchaseAt) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {supplier.outstandingDebt > 0 ? (
                          <Badge tone="warning">Qarzimiz bor</Badge>
                        ) : (
                          <Badge tone="success">Qarzi yo‘q</Badge>
                        )}
                        {supplier.status === SupplierStatus.ARCHIVED ? (
                          <Badge tone="neutral">Arxiv</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Link
                          to={ROUTES.supplierDetail(supplier.id)}
                          className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs hover:bg-surface-hover"
                        >
                          <Eye className="size-3.5" />
                          Ko‘rish
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(supplier);
                            setFormOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs hover:bg-surface-hover"
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </button>
                        {isAdmin ? (
                          supplier.status === SupplierStatus.ACTIVE ? (
                            <button
                              type="button"
                              onClick={() => void handleArchive(supplier)}
                              className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"
                            >
                              <Archive className="size-3.5" />
                              Arxiv
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleRestore(supplier)}
                              className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs hover:bg-surface-hover"
                            >
                              Tiklash
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
              Sahifa {meta.page} / {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-input border border-line px-2 py-1 disabled:opacity-50"
              >
                Oldingi
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-input border border-line px-2 py-1 disabled:opacity-50"
              >
                Keyingi
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <SupplierFormDialog
        mode={editing ? 'edit' : 'create'}
        supplier={editing}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() =>
          setMessage(editing ? 'Yetkazuvchi yangilandi.' : 'Yangi yetkazuvchi qo‘shildi.')
        }
      />
    </PageContainer>
  );
}
