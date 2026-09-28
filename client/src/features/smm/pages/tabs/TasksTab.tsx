import {
  FeatureKey,
  SMM_TASK_STATUS_LABELS,
  SmmTaskStatus,
  type SmmTaskStatus as SmmTaskStatusT,
} from '@furniture-erp/shared';
import { ListTodo, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { useWorkerLookup } from '@/features/sales/hooks/use-sales';
import { ApiClientError } from '@/lib/api-client';

import { useCreateSmmTask, useSmmTasks, useUpdateSmmTask } from '../../hooks/use-smm';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS } from '../../utils/ui';
import { useSmmProjectId } from '../project-context';

export function TasksTab() {
  const projectId = useSmmProjectId();
  const [status, setStatus] = useState<SmmTaskStatusT | 'ALL'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [userId, setUserId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tasks = useSmmTasks(projectId, { status, pageSize: 50 });
  const create = useCreateSmmTask(projectId);
  const update = useUpdateSmmTask(projectId);
  const workers = useWorkerLookup('');

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!title.trim() || !userId) {
      setError('Sarlavha va ishchi majburiy');
      return;
    }
    try {
      await create.mutateAsync({
        title: title.trim(),
        userId,
        deadline: deadline ? `${deadline}T18:00:00.000Z` : null,
      });
      setFormOpen(false);
      setTitle('');
      setUserId('');
      setDeadline('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Yaratib bo‘lmadi');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <select
          className={`${FIELD_CLASS} sm:w-48`}
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="ALL">Barcha holatlar</option>
          {Object.values(SmmTaskStatus).map((s) => (
            <option key={s} value={s}>{SMM_TASK_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <WriteGuard
          feature={FeatureKey.SMM_PROJECTS}
          className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white"
          onClick={() => setFormOpen(true)}
        >
          <Plus className="size-4" />
          Vazifa
        </WriteGuard>
      </div>

      {tasks.isError ? (
        <ErrorState
          title="Vazifalar yuklanmadi"
          message={tasks.error instanceof ApiClientError ? tasks.error.message : 'Qayta urinib ko‘ring'}
          onRetry={() => void tasks.refetch()}
        />
      ) : tasks.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (tasks.data?.items ?? []).length === 0 ? (
        <EmptyState icon={ListTodo} title="Vazifa yo‘q" description="Jamoa uchun vazifa yarating" />
      ) : (
        <SectionCard title="Vazifalar">
          <ul className="divide-y divide-line">
            {(tasks.data?.items ?? []).map((task) => (
              <li key={task.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{task.title}</p>
                  <p className="text-xs text-ink-muted">
                    {task.user.fullName}
                    {task.deadline ? ` · ${task.deadline.slice(0, 10)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={task.status === SmmTaskStatus.COMPLETED ? 'success' : 'neutral'}>
                    {SMM_TASK_STATUS_LABELS[task.status]}
                  </Badge>
                  <select
                    className={FIELD_CLASS}
                    value={task.status}
                    onChange={(e) =>
                      void update.mutateAsync({
                        taskId: task.id,
                        body: {
                          status: e.target.value as typeof task.status,
                          completedAt:
                            e.target.value === SmmTaskStatus.COMPLETED
                              ? new Date().toISOString()
                              : null,
                        },
                      })
                    }
                  >
                    {Object.values(SmmTaskStatus).map((s) => (
                      <option key={s} value={s}>{SMM_TASK_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title="Yangi vazifa">
        <form className="space-y-3" onSubmit={(e) => void handleCreate(e)}>
          <input className={FIELD_CLASS} placeholder="Sarlavha" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className={FIELD_CLASS} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Ishchi…</option>
            {(workers.data ?? []).map((w) => (
              <option key={w.id} value={w.id}>{w.fullName}</option>
            ))}
          </select>
          <input type="date" className={FIELD_CLASS} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          {error ? <p className="text-sm text-danger-700">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={() => setFormOpen(false)}>Bekor</button>
            <button type="submit" className={BTN_PRIMARY} disabled={create.isPending}>Saqlash</button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
