import {
  FeatureKey,
  SMM_PROJECT_MEMBER_ROLE_LABELS,
  SmmProjectMemberRole,
  type SmmProjectMemberRole as SmmProjectMemberRoleT,
} from '@furniture-erp/shared';
import { Plus, Users } from 'lucide-react';
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

import {
  useRemoveSmmMember,
  useSmmMembers,
  useUpsertSmmMember,
} from '../../hooks/use-smm';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS } from '../../utils/ui';
import { useSmmProjectId } from '../project-context';

export function TeamTab() {
  const projectId = useSmmProjectId();
  const members = useSmmMembers(projectId);
  const upsert = useUpsertSmmMember(projectId);
  const remove = useRemoveSmmMember(projectId);
  const workers = useWorkerLookup('');
  const [formOpen, setFormOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<SmmProjectMemberRoleT>(SmmProjectMemberRole.EDITOR);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!userId) {
      setError('Ishchini tanlang');
      return;
    }
    try {
      await upsert.mutateAsync({ userId, role, isActive: true });
      setFormOpen(false);
      setUserId('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Qo‘shib bo‘lmadi');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <WriteGuard
          feature={FeatureKey.SMM_PROJECTS}
          className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white"
          onClick={() => setFormOpen(true)}
        >
          <Plus className="size-4" />
          A’zo
        </WriteGuard>
      </div>

      {members.isError ? (
        <ErrorState
          title="Jamoa yuklanmadi"
          message={members.error instanceof ApiClientError ? members.error.message : 'Qayta urinib ko‘ring'}
          onRetry={() => void members.refetch()}
        />
      ) : members.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (members.data ?? []).length === 0 ? (
        <EmptyState icon={Users} title="A’zo yo‘q" description="Loyihaga jamoa a’zosini qo‘shing" />
      ) : (
        <SectionCard title="Jamoa">
          <ul className="divide-y divide-line">
            {(members.data ?? []).map((member) => (
              <li key={member.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{member.user.fullName}</p>
                  <p className="text-xs text-ink-muted">
                    {SMM_PROJECT_MEMBER_ROLE_LABELS[member.role]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={member.isActive ? 'success' : 'neutral'}>
                    {member.isActive ? 'Faol' : 'Nofaol'}
                  </Badge>
                  <WriteGuard
                    feature={FeatureKey.SMM_PROJECTS}
                    className={BTN_SECONDARY}
                    onClick={() => {
                      if (window.confirm('A’zoni olib tashlaysizmi?')) {
                        void remove.mutateAsync(member.id);
                      }
                    }}
                  >
                    O‘chirish
                  </WriteGuard>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title="Jamoa a’zosi">
        <form className="space-y-3" onSubmit={(e) => void handleAdd(e)}>
          <select className={FIELD_CLASS} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Ishchi…</option>
            {(workers.data ?? []).map((w) => (
              <option key={w.id} value={w.id}>{w.fullName}</option>
            ))}
          </select>
          <select className={FIELD_CLASS} value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            {Object.values(SmmProjectMemberRole).map((r) => (
              <option key={r} value={r}>{SMM_PROJECT_MEMBER_ROLE_LABELS[r]}</option>
            ))}
          </select>
          {error ? <p className="text-sm text-danger-700">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={() => setFormOpen(false)}>Bekor</button>
            <button type="submit" className={BTN_PRIMARY} disabled={upsert.isPending}>Qo‘shish</button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
