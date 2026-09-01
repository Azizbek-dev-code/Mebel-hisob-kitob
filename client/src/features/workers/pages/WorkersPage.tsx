import {
  WorkerResponsibility,
  WORKER_RESPONSIBILITY_LABELS,
  type WorkerListQuery,
} from '@furniture-erp/shared';
import { HardHat, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { ResponsibilityBadges } from '@/features/workers/components/ResponsibilityBadges';
import { useWorkersList } from '@/features/workers/hooks/use-workers';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { formatMoney } from '@/utils/format';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

function parseResponsibility(raw: string | null): WorkerResponsibility | '' {
  if (!raw) return '';
  return (Object.values(WorkerResponsibility) as string[]).includes(raw)
    ? (raw as WorkerResponsibility)
    : '';
}

export function WorkersPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);

  const responsibility = parseResponsibility(searchParams.get('responsibility'));

  const responsibilityTabs: ReadonlyArray<{ value: '' | WorkerResponsibility; label: string }> = [
    { value: '', label: t('workers.tabAll') },
    { value: WorkerResponsibility.SELLER, label: t('workers.tabSellers') },
    { value: WorkerResponsibility.ASSEMBLER, label: t('workers.tabAssemblers') },
    { value: WorkerResponsibility.DELIVERY, label: t('workers.tabDelivery') },
    { value: WorkerResponsibility.INSTALLER, label: t('workers.tabInstallers') },
    { value: WorkerResponsibility.SMM, label: t('workers.tabSmm') },
    { value: WorkerResponsibility.OTHER, label: t('workers.tabOther') },
  ];

  const params = useMemo<WorkerListQuery>(
    () => ({
      page,
      pageSize: 20,
      search: search.trim() || undefined,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      responsibility: responsibility || undefined,
    }),
    [page, search, statusFilter, responsibility],
  );

  const list = useWorkersList(params);

  function setResponsibilityFilter(next: '' | WorkerResponsibility) {
    setPage(1);
    setSearchParams(
      (current) => {
        const updated = new URLSearchParams(current);
        if (next) updated.set('responsibility', next);
        else updated.delete('responsibility');
        return updated;
      },
      { replace: true },
    );
  }

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('workers.title')}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t('workers.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={ROUTES.workersReconciliation}
            className="inline-flex items-center justify-center rounded-input border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-hover"
          >
            Haqlar solishtirishi
          </Link>
          <WriteGuard
            to={ROUTES.workerNew}
            feature="workers"
            className="inline-flex items-center justify-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="size-4" />
            {t('workers.new')}
          </WriteGuard>
        </div>
      </div>

      <nav aria-label={t('workers.tabsAria')} className="-mx-1 max-w-full overflow-x-auto overflow-y-hidden">
        <div className="flex w-max min-w-full gap-1 rounded-input border border-line bg-surface-muted p-1">
          {responsibilityTabs.map((tab) => {
            const active = responsibility === tab.value;
            return (
              <button
                key={String(tab.value) || 'all'}
                type="button"
                onClick={() => setResponsibilityFilter(tab.value)}
                className={cn(
                  'shrink-0 rounded-[0.4rem] px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-surface text-brand-700 shadow-card'
                    : 'text-ink-soft hover:bg-surface-hover hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      <SectionCard title={t('workers.searchTitle')}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
            <input
              className={`${fieldClass} pl-9`}
              placeholder={t('workers.searchPlaceholder')}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className={fieldClass}
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as typeof statusFilter);
              setPage(1);
            }}
          >
            <option value="all">{t('workers.allStatuses')}</option>
            <option value="active">{t('common.active')}</option>
            <option value="inactive">{t('common.inactive')}</option>
          </select>
        </div>
      </SectionCard>

      {list.isError ? (
        <ErrorState
          title={t('workers.loadFailed')}
          message={list.error instanceof Error ? list.error.message : t('common.retry')}
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

      {list.data && list.data.items.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title={t('workers.emptyTitle')}
          description={
            responsibility
              ? t('workers.emptyFiltered', {
                  role: WORKER_RESPONSIBILITY_LABELS[responsibility],
                })
              : t('workers.emptyHint')
          }
        />
      ) : null}

      {list.data && list.data.items.length > 0 ? (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {list.data.items.map((worker) => (
              <li
                key={worker.id}
                className="rounded-panel border border-line bg-surface p-3 shadow-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={ROUTES.workerDetail(worker.id)}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {worker.fullName}
                  </Link>
                  <Badge tone={worker.isActive ? 'success' : 'neutral'}>
                    {worker.isActive ? t('common.active') : t('common.inactive')}
                  </Badge>
                </div>
                <div className="mt-2">
                  <ResponsibilityBadges responsibilities={worker.responsibilities} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-ink-muted">Sotuvlar</dt>
                    <dd className="font-medium text-ink">{worker.salesCount}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Ustalik</dt>
                    <dd className="font-medium text-ink">
                      {worker.assemblyCompleted ?? worker.assemblyTaskCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Yetkazish</dt>
                    <dd className="font-medium text-ink">{worker.deliveryCompleted ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">O‘rnatish</dt>
                    <dd className="font-medium text-ink">{worker.installationCompleted ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Hisoblangan</dt>
                    <dd className="tabular-money font-medium text-ink">
                      {formatMoney(worker.earned ?? 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">To‘langan</dt>
                    <dd className="tabular-money font-medium text-ink">
                      {formatMoney(worker.paid ?? 0)}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-ink-muted">Qolgan</dt>
                    <dd className="tabular-money font-semibold text-ink">
                      {formatMoney(worker.outstanding ?? 0)}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-panel border border-line bg-surface shadow-card md:block">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-xs tracking-wide text-ink-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('common.name')}</th>
                  <th className="px-4 py-3 font-medium">{t('workers.responsibility')}</th>
                  <th className="px-4 py-3 font-medium">Sotuvlar</th>
                  <th className="px-4 py-3 font-medium">Ustalik</th>
                  <th className="px-4 py-3 font-medium">Yetkazish</th>
                  <th className="px-4 py-3 font-medium">O‘rnatish</th>
                  <th className="px-4 py-3 font-medium">Hisoblangan</th>
                  <th className="px-4 py-3 font-medium">To‘langan</th>
                  <th className="px-4 py-3 font-medium">Qolgan</th>
                  <th className="px-4 py-3 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((worker) => (
                  <tr key={worker.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        to={ROUTES.workerDetail(worker.id)}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {worker.fullName}
                      </Link>
                      <div className="mt-0.5">
                        <Badge tone={worker.isActive ? 'success' : 'neutral'}>
                          {worker.isActive ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ResponsibilityBadges responsibilities={worker.responsibilities} />
                    </td>
                    <td className="px-4 py-3 text-ink">{worker.salesCount}</td>
                    <td className="px-4 py-3 text-ink">
                      {worker.assemblyCompleted ?? worker.assemblyTaskCount}
                    </td>
                    <td className="px-4 py-3 text-ink">{worker.deliveryCompleted ?? 0}</td>
                    <td className="px-4 py-3 text-ink">{worker.installationCompleted ?? 0}</td>
                    <td className="tabular-money px-4 py-3 text-ink">
                      {formatMoney(worker.earned ?? 0)}
                    </td>
                    <td className="tabular-money px-4 py-3 text-ink">
                      {formatMoney(worker.paid ?? 0)}
                    </td>
                    <td className="tabular-money px-4 py-3 font-medium text-ink">
                      {formatMoney(worker.outstanding ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={ROUTES.workerDetail(worker.id)}
                          className="text-sm font-medium text-brand-700 hover:underline"
                        >
                          {t('common.view')}
                        </Link>
                        <Link
                          to={ROUTES.workerFinances(worker.id)}
                          className="text-sm font-medium text-ink-soft hover:underline"
                        >
                          Moliya
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {list.data.meta.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-muted">
                {t('common.pageOf', {
                  page: list.data.meta.page,
                  total: list.data.meta.totalPages,
                })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-input border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={!list.data.meta.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {t('common.previous')}
                </button>
                <button
                  type="button"
                  className="rounded-input border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={!list.data.meta.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {t('common.next')}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </PageContainer>
  );
}
