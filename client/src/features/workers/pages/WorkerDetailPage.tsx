import { HardHat, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ResponsibilityBadges } from '@/features/workers/components/ResponsibilityBadges';
import { WorkerProfileModulesPanel } from '@/features/workers/components/WorkerProfileModulesPanel';
import {
  useResetWorkerPassword,
  useUpdateWorker,
  useWorker,
  useWorkerActivity,
  useWorkerProfileModules,
} from '@/features/workers/hooks/use-workers';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatDateTime } from '@/utils/format';
import {
  WORKER_ACTIVITY_LABELS,
  type WorkerActivityItem,
} from '@furniture-erp/shared';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export function WorkerDetailPage() {
  const { id = '' } = useParams();
  const worker = useWorker(id);
  const modulesQuery = useWorkerProfileModules(id);
  const activity = useWorkerActivity(id);
  const updateWorker = useUpdateWorker(id);
  const resetPassword = useResetWorkerPassword(id);

  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function toggleActive() {
    if (!worker.data) return;
    setStatusError(null);
    try {
      await updateWorker.mutateAsync({ isActive: !worker.data.isActive });
    } catch (err) {
      setStatusError(err instanceof ApiClientError ? err.message : 'Could not update status');
    }
  }

  async function onResetPassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordMessage(null);
    try {
      await resetPassword.mutateAsync({ password: newPassword });
      setNewPassword('');
      setPasswordMessage('Password updated. The previous password no longer works.');
    } catch (err) {
      setPasswordMessage(err instanceof ApiClientError ? err.message : 'Could not reset password');
    }
  }

  if (worker.isError) {
    return (
      <PageContainer>
        <ErrorState
          title="Could not load worker"
          message={worker.error instanceof Error ? worker.error.message : 'Try again.'}
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

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">{detail.fullName}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            @{detail.username ?? detail.email} · joined {formatDate(detail.createdAt)}
          </p>
          <div className="mt-2">
            <ResponsibilityBadges responsibilities={detail.responsibilities} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={ROUTES.workerFinances(detail.id)}
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Moliyaviy hisob
          </Link>
          <Link
            to={ROUTES.workerCompensation(detail.id)}
            className="rounded-input border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
          >
            Hisoblash qoidalari
          </Link>
          <Link
            to={ROUTES.workerEdit(detail.id)}
            className="rounded-input border border-line px-3 py-2 text-sm text-ink hover:bg-surface-hover"
          >
            Edit
          </Link>
          <button
            type="button"
            disabled={updateWorker.isPending}
            onClick={() => void toggleActive()}
            className="rounded-input border border-line px-3 py-2 text-sm text-ink hover:bg-surface-hover disabled:opacity-60"
          >
            {detail.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <Link
            to={ROUTES.workers}
            className="rounded-input border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface-hover"
          >
            Back
          </Link>
        </div>
      </div>

      {statusError ? (
        <p role="alert" className="text-sm text-danger-700">
          {statusError}
        </p>
      ) : null}

      <SectionCard
        title="Profile"
        action={
          <Badge tone={detail.isActive ? 'success' : 'neutral'}>
            {detail.isActive ? 'Active' : 'Inactive'}
          </Badge>
        }
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Username</dt>
            <dd className="font-medium text-ink">{detail.username ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Phone</dt>
            <dd className="text-ink">{detail.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Email</dt>
            <dd className="text-ink">{detail.email}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Last login</dt>
            <dd className="text-ink">
              {detail.lastLoginAt ? formatDateTime(detail.lastLoginAt) : 'Never'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-ink-muted">Notes</dt>
            <dd className="text-ink">{detail.notes || '—'}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Profil modullari" description="Mas’uliyat bo‘yicha ko‘rsatkichlar">
        <WorkerProfileModulesPanel
          modules={modulesQuery.data}
          isLoading={modulesQuery.isLoading}
          isError={modulesQuery.isError}
          onRetry={() => void modulesQuery.refetch()}
        />
      </SectionCard>

      <SectionCard title="Activity history">
        <ActivityList items={activity.data ?? []} loading={activity.isLoading} />
      </SectionCard>

      <SectionCard title="Reset password">
        <form
          onSubmit={(event) => void onResetPassword(event)}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <label className="block text-sm font-medium text-ink">New password</label>
            <input
              type="password"
              className={fieldClass}
              minLength={8}
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={resetPassword.isPending}
            className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {resetPassword.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Reset password
          </button>
        </form>
        {passwordMessage ? <p className="mt-2 text-sm text-ink-muted">{passwordMessage}</p> : null}
      </SectionCard>
    </PageContainer>
  );
}

function ActivityList({ items, loading }: { items: WorkerActivityItem[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-24 w-full" />;
  if (items.length === 0) {
    return (
      <EmptyState
        icon={HardHat}
        title="No activity yet"
        description="Sales and assembly events will appear here."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
          <p className="text-sm font-medium text-ink">{WORKER_ACTIVITY_LABELS[item.type]}</p>
          <p className="text-sm text-ink-muted">
            {item.message ?? '—'}
            {item.actorName ? ` · by ${item.actorName}` : ''}
          </p>
          <p className="text-xs text-ink-subtle">{formatDateTime(item.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}
