import { AssemblyTaskStatus } from '@furniture-erp/shared';
import { CheckCircle2, Loader2, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatDateTime } from '@/utils/format';
import {
  assemblyStatusLabel,
  assemblyStatusTone,
  formatSaleNumber,
} from '@/utils/sales';

import { useMyAssemblyTasks, useUpdateAssemblyTask } from '../hooks/use-sales';

type TaskFilter = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

/**
 * Worker inbox for assembly assignments (terlash).
 * Shows only tasks assigned to the signed-in worker.
 */
export function AssemblyTasksPage() {
  const [filter, setFilter] = useState<TaskFilter>('ALL');
  const status =
    filter === 'ALL' ? undefined : (filter as typeof AssemblyTaskStatus.PENDING);
  const tasks = useMyAssemblyTasks(status);
  const updateTask = useUpdateAssemblyTask();

  return (
    <PageContainer className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">My assembly tasks</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Furniture assigned to you for assembly (terlash).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['ALL', 'All'],
            ['PENDING', 'Pending'],
            ['IN_PROGRESS', 'In progress'],
            ['COMPLETED', 'Completed'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-input border px-3 py-1.5 text-sm ${
              filter === value
                ? 'border-brand-500 bg-brand-50 text-brand-800'
                : 'border-line text-ink-soft hover:bg-surface-hover'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tasks.isError ? (
        <ErrorState
          title="Could not load tasks"
          message={tasks.error instanceof Error ? tasks.error.message : 'Try again.'}
          onRetry={() => void tasks.refetch()}
        />
      ) : null}

      {tasks.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : null}

      {tasks.data && tasks.data.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No assembly tasks"
          description="When a seller assigns furniture to you, it will appear here."
        />
      ) : null}

      {tasks.data && tasks.data.length > 0 ? (
        <div className="space-y-4">
          {tasks.data.map((task) => {
            const isOpen =
              task.status === AssemblyTaskStatus.PENDING ||
              task.status === AssemblyTaskStatus.IN_PROGRESS;

            return (
              <SectionCard
                key={task.id}
                title={`${formatSaleNumber(task.saleNumber)} · ${task.productSummary}`}
                action={
                  <Badge tone={assemblyStatusTone(task.status)}>
                    {assemblyStatusLabel(task.status)}
                  </Badge>
                }
              >
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-ink-muted">Customer</dt>
                    <dd className="text-ink">{task.customerName}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Assigned</dt>
                    <dd className="text-ink">{formatDate(task.assignedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Deadline</dt>
                    <dd className="text-ink">
                      {task.deadline ? formatDate(task.deadline) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Completed</dt>
                    <dd className="text-ink">
                      {task.completedAt ? formatDateTime(task.completedAt) : '—'}
                    </dd>
                  </div>
                  {task.notes ? (
                    <div className="sm:col-span-2">
                      <dt className="text-ink-muted">Notes</dt>
                      <dd className="text-ink">{task.notes}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={ROUTES.saleDetail(task.saleId)}
                    className="rounded-input border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface-hover"
                  >
                    View sale
                  </Link>

                  {task.status === AssemblyTaskStatus.PENDING ? (
                    <button
                      type="button"
                      disabled={updateTask.isPending}
                      onClick={() =>
                        updateTask.mutate({
                          id: task.id,
                          body: { status: AssemblyTaskStatus.IN_PROGRESS },
                        })
                      }
                      className="rounded-input border border-line px-3 py-2 text-sm text-ink hover:bg-surface-hover disabled:opacity-60"
                    >
                      Start
                    </button>
                  ) : null}

                  {isOpen ? (
                    <button
                      type="button"
                      disabled={updateTask.isPending}
                      onClick={() =>
                        updateTask.mutate({
                          id: task.id,
                          body: { status: AssemblyTaskStatus.COMPLETED },
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-input bg-success-600 px-3 py-2 text-sm font-medium text-white hover:bg-success-700 disabled:opacity-60"
                    >
                      {updateTask.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Complete
                    </button>
                  ) : null}
                </div>
              </SectionCard>
            );
          })}
        </div>
      ) : null}
    </PageContainer>
  );
}
