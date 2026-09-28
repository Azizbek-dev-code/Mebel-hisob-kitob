import {
  SMM_ASSIGNMENT_STATUS_LABELS,
  SMM_PROJECT_MEMBER_ROLE_LABELS,
  SmmAssignmentStatus,
  SmmProjectMemberRole,
  type SmmAssignmentStatus as SmmAssignmentStatusType,
  type SmmContentAssignmentListItem,
} from '@furniture-erp/shared';
import { Loader2, Plus, Trash2, ListTodo, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { ApiClientError } from '@/lib/api-client';
import { useWorkerLookup } from '@/features/sales/hooks/use-sales';

import {
  useCreateSmmAssignment,
  useDeleteSmmAssignment,
  useGenerateTaskFromAssignment,
  useSmmAssignments,
  useUpdateSmmAssignment,
} from '../hooks/use-smm';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS } from '../utils/ui';

interface ContentAssignmentsPanelProps {
  projectId: string;
  contentItemId: string;
}

export function ContentAssignmentsPanel({ projectId, contentItemId }: ContentAssignmentsPanelProps) {
  const assignments = useSmmAssignments(contentItemId);
  const create = useCreateSmmAssignment(contentItemId);
  const update = useUpdateSmmAssignment(contentItemId);
  const remove = useDeleteSmmAssignment(contentItemId);
  const generateTask = useGenerateTaskFromAssignment(contentItemId, projectId);
  const workers = useWorkerLookup('');

  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<string>(SmmProjectMemberRole.EDITOR);
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!userId) {
      setError('Ishchini tanlang');
      return;
    }
    try {
      await create.mutateAsync({
        userId,
        role,
        deadline: deadline ? `${deadline}T18:00:00.000Z` : null,
      });
      setUserId('');
      setDeadline('');
      setMessage('Tayinlash qo‘shildi');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Qo‘shib bo‘lmadi');
    }
  }

  async function setStatus(item: SmmContentAssignmentListItem, status: SmmAssignmentStatusType) {
    try {
      await update.mutateAsync({ assignmentId: item.id, body: { status } });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Yangilab bo‘lmadi');
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-ink">Tayinlashlar</h3>
      {message ? <p className="text-sm text-success-700">{message}</p> : null}
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}

      <form className="grid gap-2 rounded-input border border-line bg-surface-muted p-3 sm:grid-cols-4" onSubmit={(e) => void handleAdd(e)}>
        <select className={FIELD_CLASS} value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Ishchi…</option>
          {(workers.data ?? []).map((w) => (
            <option key={w.id} value={w.id}>{w.fullName}</option>
          ))}
        </select>
        <select className={FIELD_CLASS} value={role} onChange={(e) => setRole(e.target.value)}>
          {Object.values(SmmProjectMemberRole).map((r) => (
            <option key={r} value={r}>{SMM_PROJECT_MEMBER_ROLE_LABELS[r]}</option>
          ))}
        </select>
        <input type="date" className={FIELD_CLASS} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        <button type="submit" className={BTN_PRIMARY} disabled={create.isPending}>
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Qo‘shish
        </button>
      </form>

      {assignments.isLoading ? (
        <p className="text-sm text-ink-muted">Yuklanmoqda…</p>
      ) : (assignments.data?.items ?? []).length === 0 ? (
        <EmptyState icon={Users} title="Tayinlash yo‘q" description="Kontentga jamoa a’zosini biriktiring" />
      ) : (
        <ul className="space-y-2">
          {(assignments.data?.items ?? []).map((item) => (
            <li key={item.id} className="flex flex-col gap-2 rounded-input border border-line bg-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{item.user.fullName}</p>
                <p className="text-xs text-ink-muted">
                  {SMM_PROJECT_MEMBER_ROLE_LABELS[item.role as keyof typeof SMM_PROJECT_MEMBER_ROLE_LABELS] ?? item.role}
                  {item.deadline ? ` · ${item.deadline.slice(0, 10)}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{SMM_ASSIGNMENT_STATUS_LABELS[item.status]}</Badge>
                <select
                  className={FIELD_CLASS}
                  value={item.status}
                  onChange={(e) => void setStatus(item, e.target.value as typeof item.status)}
                >
                  {Object.values(SmmAssignmentStatus).map((s) => (
                    <option key={s} value={s}>{SMM_ASSIGNMENT_STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className={BTN_SECONDARY}
                  title="Vazifa yaratish"
                  onClick={() => void generateTask.mutateAsync(item.id).then(() => setMessage('Vazifa yaratildi')).catch((err) => setError(err instanceof ApiClientError ? err.message : 'Xato'))}
                >
                  <ListTodo className="size-4" />
                </button>
                <button
                  type="button"
                  className={BTN_SECONDARY}
                  onClick={() => {
                    if (window.confirm('Tayinlashni o‘chirasizmi?')) void remove.mutateAsync(item.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
