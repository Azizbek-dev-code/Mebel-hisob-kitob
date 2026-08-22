import { WorkerResponsibility, type WorkerListQuery } from '@furniture-erp/shared';
import { Eye, Hammer, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorkersList } from '@/features/workers/hooks/use-workers';
import { ROUTES } from '@/routes/paths';
import { WriteGuard } from '@/features/subscription/WriteGuard';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export function MastersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);

  const params = useMemo<WorkerListQuery>(
    () => ({
      page,
      pageSize: 20,
      search: search.trim() || undefined,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      responsibility: WorkerResponsibility.ASSEMBLER,
    }),
    [page, search, statusFilter],
  );

  const list = useWorkersList(params);

  return (
    <PageContainer className="space-y-6">
      <div data-testid="masters-page" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Ustalar</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Teruvchilar (ASSEMBLER) — mavjud ishchilar ma&apos;lumotlaridan
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={ROUTES.workers}
            className="inline-flex items-center justify-center gap-2 rounded-input border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-hover"
          >
            Ishchilar
          </Link>
          <WriteGuard
            to={ROUTES.workerNew}
            feature="masters"
            className="inline-flex items-center justify-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="size-4" />
            Yangi usta
          </WriteGuard>
        </div>
      </div>

      <SectionCard title="Filtrlar">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
            <input
              className={`${fieldClass} pl-9`}
              placeholder="Ism yoki telefon bo‘yicha qidirish"
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
            <option value="inactive">Nofaol</option>
          </select>
        </div>
      </SectionCard>

      {list.isError ? (
        <ErrorState
          title="Ustalarni yuklab bo‘lmadi"
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
          icon={Hammer}
          title="Ustalar topilmadi"
          description="Teruvchi (ASSEMBLER) mas’uliyatiga ega ishchi qo‘shing — Ishchilar bo‘limidan yoki Yangi usta tugmasi orqali."
        />
      ) : null}

      {list.data && list.data.items.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-panel border border-line bg-surface shadow-card">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Ism</th>
                  <th className="px-4 py-3 font-medium">Telefon</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Jami ishlar</th>
                  <th className="px-4 py-3 font-medium">Faol</th>
                  <th className="px-4 py-3 font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((worker) => (
                  <tr key={worker.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{worker.fullName}</td>
                    <td className="px-4 py-3 text-ink-soft">{worker.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={worker.isActive ? 'success' : 'neutral'}>
                        {worker.isActive ? 'Faol' : 'Nofaol'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink">{worker.assemblyTaskCount}</td>
                    <td className="px-4 py-3 text-ink">{worker.activeTaskCount}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={ROUTES.masterDetail(worker.id)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                      >
                        <Eye className="size-3.5" />
                        Ko‘rish
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {list.data.meta.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-muted">
                {list.data.meta.page}-sahifa, jami {list.data.meta.totalPages}
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
      </div>
    </PageContainer>
  );
}
