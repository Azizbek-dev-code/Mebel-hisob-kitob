import {
  AssemblyTaskStatus,
  WorkerResponsibility,
  type WorkerTaskItem,
} from '@furniture-erp/shared';
import { Wrench } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorker, useWorkerTasks } from '@/features/workers/hooks/use-workers';
import { ROUTES } from '@/routes/paths';
import { formatDate } from '@/utils/format';
import { assemblyStatusLabel, assemblyStatusTone, formatSaleNumber } from '@/utils/sales';

const TASK_STATUS_GROUPS: {
  status: AssemblyTaskStatus;
  title: string;
}[] = [
  { status: AssemblyTaskStatus.PENDING, title: 'Kutilmoqda' },
  { status: AssemblyTaskStatus.IN_PROGRESS, title: 'Jarayonda' },
  { status: AssemblyTaskStatus.COMPLETED, title: 'Bajarilgan' },
  { status: AssemblyTaskStatus.CANCELLED, title: 'Bekor qilingan' },
];

function groupTasksByStatus(tasks: WorkerTaskItem[]): Map<AssemblyTaskStatus, WorkerTaskItem[]> {
  const groups = new Map<AssemblyTaskStatus, WorkerTaskItem[]>();
  for (const entry of TASK_STATUS_GROUPS) {
    groups.set(entry.status, []);
  }
  for (const task of tasks) {
    groups.get(task.status)?.push(task);
  }
  return groups;
}

export function MasterDetailPage() {
  const { id = '' } = useParams();
  const worker = useWorker(id);
  const tasks = useWorkerTasks(id);

  const groupedTasks = useMemo(() => groupTasksByStatus(tasks.data ?? []), [tasks.data]);

  if (worker.isError) {
    return (
      <PageContainer>
        <ErrorState
          title="Ustani yuklab bo‘lmadi"
          message={worker.error instanceof Error ? worker.error.message : 'Qayta urinib ko‘ring.'}
          onRetry={() => void worker.refetch()}
        />
      </PageContainer>
    );
  }

  if (worker.isLoading || !worker.data) {
    return (
      <PageContainer className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </PageContainer>
    );
  }

  const detail = worker.data;
  const isAssembler = detail.responsibilities.includes(WorkerResponsibility.ASSEMBLER);

  if (!isAssembler) {
    return (
      <PageContainer>
        <ErrorState
          title="Bu ishchi usta emas"
          message="Usta profilini ko‘rish uchun ishchiga ASSEMBLER mas’uliyati biriktirilgan bo‘lishi kerak."
        />
        <div className="mt-4 text-center">
          <Link
            to={ROUTES.workers}
            className="inline-flex rounded-input border border-line px-3 py-2 text-sm text-ink hover:bg-surface-hover"
          >
            Ishchilar ro‘yxati
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6" data-testid="master-detail-page">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">{detail.fullName}</h2>
          <p className="mt-1 text-sm text-ink-muted">{detail.phone ?? 'Telefon ko‘rsatilmagan'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={ROUTES.workerDetail(detail.id)}
            className="rounded-input border border-line px-3 py-2 text-sm text-ink hover:bg-surface-hover"
          >
            To‘liq profil
          </Link>
          <Link
            to={ROUTES.masters}
            className="rounded-input border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface-hover"
          >
            Ustalar
          </Link>
        </div>
      </div>

      <SectionCard
        title="Profil"
        action={
          <Badge tone={detail.isActive ? 'success' : 'neutral'}>
            {detail.isActive ? 'Faol' : 'Nofaol'}
          </Badge>
        }
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Ism</dt>
            <dd className="font-medium text-ink">{detail.fullName}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Telefon</dt>
            <dd className="text-ink">{detail.phone ?? '—'}</dd>
          </div>
        </dl>
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-3">
        <SectionCard title="Kutilmoqda">
          <p className="text-2xl font-semibold tracking-tight text-ink">
            {detail.stats.pendingAssemblyTasks}
          </p>
        </SectionCard>
        <SectionCard title="Bajarilgan">
          <p className="text-2xl font-semibold tracking-tight text-ink">
            {detail.stats.completedAssemblyTasks}
          </p>
        </SectionCard>
        <SectionCard title="Jami ishlar">
          <p className="text-2xl font-semibold tracking-tight text-ink">
            {detail.stats.totalAssemblyTasks}
          </p>
        </SectionCard>
      </div>

      <SectionCard title="Terlash vazifalari">
        {tasks.isLoading ? <Skeleton className="h-24 w-full" /> : null}
        {tasks.data && tasks.data.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="Vazifalar yo‘q"
            description="Hali terlash vazifalari biriktirilmagan."
          />
        ) : null}
        {tasks.data && tasks.data.length > 0 ? (
          <div className="space-y-6">
            {TASK_STATUS_GROUPS.map(({ status, title }) => {
              const items = groupedTasks.get(status) ?? [];
              if (items.length === 0) return null;

              return (
                <div key={status}>
                  <h3 className="mb-3 text-sm font-semibold text-ink">{title}</h3>
                  <div className="space-y-3">
                    {items.map((task) => (
                      <div
                        key={task.id}
                        className="flex flex-col gap-2 rounded-input border border-line px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-ink">
                            {task.saleId ? (
                              <Link
                                to={ROUTES.saleDetail(task.saleId)}
                                className="text-brand-700 hover:underline"
                              >
                                {formatSaleNumber(task.saleNumber)}
                              </Link>
                            ) : (
                              formatSaleNumber(task.saleNumber)
                            )}
                            {' · '}
                            {task.productSummary}
                          </p>
                          <p className="text-sm text-ink-muted">
                            {task.customerName} · biriktirilgan {formatDate(task.assignedAt)}
                          </p>
                        </div>
                        <Badge tone={assemblyStatusTone(task.status)}>
                          {assemblyStatusLabel(task.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Kompensatsiya">
        <div className="flex flex-wrap gap-3">
          <Link
            to={ROUTES.workerCompensation(detail.id)}
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Kompensatsiya qoidalari
          </Link>
          <Link
            to={ROUTES.workerCompensationPreview(detail.id)}
            className="rounded-input border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
          >
            Oldindan ko‘rish
          </Link>
        </div>
      </SectionCard>
    </PageContainer>
  );
}
