import {
  WorkerResponsibility,
  WORKER_RESPONSIBILITY_LABELS,
  type WorkerListQuery,
} from '@furniture-erp/shared';
import { HardHat, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { formatDate } from '@/utils/format';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const RESPONSIBILITY_TABS: ReadonlyArray<{ value: '' | WorkerResponsibility; label: string }> = [
  { value: '', label: 'Barchasi' },
  { value: WorkerResponsibility.SELLER, label: 'Sotuvchilar' },
  { value: WorkerResponsibility.ASSEMBLER, label: 'Ustalar' },
  { value: WorkerResponsibility.DELIVERY, label: 'Yetkazib beruvchilar' },
  { value: WorkerResponsibility.INSTALLER, label: "O'rnatuvchilar" },
  { value: WorkerResponsibility.SMM, label: 'SMM' },
  { value: WorkerResponsibility.OTHER, label: 'Boshqalar' },
];

function parseResponsibility(raw: string | null): WorkerResponsibility | '' {
  if (!raw) return '';
  return (Object.values(WorkerResponsibility) as string[]).includes(raw)
    ? (raw as WorkerResponsibility)
    : '';
}

export function WorkersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);

  const responsibility = parseResponsibility(searchParams.get('responsibility'));

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
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Ishchilar</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Sotuvchi, usta, yetkazib beruvchi va boshqa vazifalar — bitta ro&apos;yxatda.
          </p>
        </div>
        <WriteGuard
          to={ROUTES.workerNew}
          feature="workers"
          className="inline-flex items-center justify-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="size-4" />
          Yangi ishchi
        </WriteGuard>
      </div>

      <nav aria-label="Ishchi vazifalari" className="-mx-1 max-w-full overflow-x-auto overflow-y-hidden">
        <div className="flex w-max min-w-full gap-1 rounded-input border border-line bg-surface-muted p-1">
          {RESPONSIBILITY_TABS.map((tab) => {
            const active = responsibility === tab.value;
            return (
              <button
                key={tab.label}
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

      <SectionCard title="Qidiruv">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
            <input
              className={`${fieldClass} pl-9`}
              placeholder="Ism, login yoki telefon"
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
            <option value="all">Barcha holatlar</option>
            <option value="active">Faol</option>
            <option value="inactive">Faol emas</option>
          </select>
        </div>
      </SectionCard>

      {list.isError ? (
        <ErrorState
          title="Ishchilarni yuklab bo'lmadi"
          message={list.error instanceof Error ? list.error.message : 'Qayta urinib ko‘ring.'}
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
          title="Ishchi topilmadi"
          description={
            responsibility
              ? `${WORKER_RESPONSIBILITY_LABELS[responsibility]} vazifasidagi ishchi yo‘q.`
              : 'Do‘kon uchun yangi ishchi hisobi yarating.'
          }
        />
      ) : null}

      {list.data && list.data.items.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-panel border border-line bg-surface shadow-card">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-xs tracking-wide text-ink-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Ism</th>
                  <th className="px-4 py-3 font-medium">Telefon</th>
                  <th className="px-4 py-3 font-medium">Vazifa</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ishga kirgan</th>
                  <th className="px-4 py-3 font-medium">Sotuvlar</th>
                  <th className="px-4 py-3 font-medium">Topshiriqlar</th>
                  <th className="px-4 py-3 font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((worker) => (
                  <tr key={worker.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{worker.fullName}</td>
                    <td className="px-4 py-3 text-ink-soft">{worker.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <ResponsibilityBadges responsibilities={worker.responsibilities} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={worker.isActive ? 'success' : 'neutral'}>
                        {worker.isActive ? 'Faol' : 'Faol emas'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{formatDate(worker.createdAt)}</td>
                    <td className="px-4 py-3 text-ink">{worker.salesCount}</td>
                    <td className="px-4 py-3 text-ink">{worker.assemblyTaskCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={ROUTES.workerDetail(worker.id)}
                          className="text-sm font-medium text-brand-700 hover:underline"
                        >
                          Ko‘rish
                        </Link>
                        <Link
                          to={ROUTES.workerCompensation(worker.id)}
                          className="text-sm font-medium text-ink-soft hover:underline"
                        >
                          Haq
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
                Sahifa {list.data.meta.page} / {list.data.meta.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-input border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={!list.data.meta.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Oldingi
                </button>
                <button
                  type="button"
                  className="rounded-input border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={!list.data.meta.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Keyingi
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </PageContainer>
  );
}
