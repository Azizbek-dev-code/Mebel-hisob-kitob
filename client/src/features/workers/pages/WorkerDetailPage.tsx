import {
  WORKER_ACTIVITY_LABELS,
  type WorkerActivityItem,
} from '@furniture-erp/shared';
import { HardHat, Loader2, ShoppingCart, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ResponsibilityBadges } from '@/features/workers/components/ResponsibilityBadges';
import { WorkerStatsGrid } from '@/features/workers/components/WorkerStatsGrid';
import {
  useResetWorkerPassword,
  useUpdateWorker,
  useWorker,
  useWorkerActivity,
  useWorkerSales,
  useWorkerTasks,
} from '@/features/workers/hooks/use-workers';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatDateTime, formatMoney } from '@/utils/format';
import { assemblyStatusLabel, assemblyStatusTone, formatSaleNumber } from '@/utils/sales';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export function WorkerDetailPage() {
  const { id = '' } = useParams();
  const worker = useWorker(id);
  const sales = useWorkerSales(id, { page: 1, pageSize: 10 });
  const tasks = useWorkerTasks(id);
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

      <SectionCard title="Responsibilities">
        <ResponsibilityBadges responsibilities={detail.responsibilities} />
      </SectionCard>

      <SectionCard title="Activity summary">
        <WorkerStatsGrid stats={detail.stats} />
      </SectionCard>

      <SectionCard title="Sales">
        {sales.data && sales.data.items.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No sales" description="This worker has not sold anything yet." />
        ) : null}
        {sales.data && sales.data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="text-xs uppercase text-ink-muted">
                <tr>
                  <th className="py-2 pr-3">Sale</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.data.items.map((sale) => (
                  <tr key={sale.id} className="border-t border-line">
                    <td className="py-2 pr-3">
                      <Link to={ROUTES.saleDetail(sale.id)} className="text-brand-700 hover:underline">
                        {formatSaleNumber(sale.saleNumber)}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">{formatDate(sale.saleDate)}</td>
                    <td className="py-2 pr-3">{sale.customerName}</td>
                    <td className="py-2 pr-3">{sale.productSummary}</td>
                    <td className="py-2 pr-3">{formatMoney(sale.totalSalePrice)}</td>
                    <td className="py-2">{sale.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Assembly tasks">
        {tasks.data && tasks.data.length === 0 ? (
          <EmptyState icon={Wrench} title="No assembly tasks" description="No terlash assignments yet." />
        ) : null}
        {tasks.data && tasks.data.length > 0 ? (
          <div className="space-y-3">
            {tasks.data.map((task) => (
              <div
                key={task.id}
                className="flex flex-col gap-2 rounded-input border border-line px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-ink">
                    {formatSaleNumber(task.saleNumber)} · {task.productSummary}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {task.customerName} · assigned {formatDate(task.assignedAt)}
                  </p>
                </div>
                <Badge tone={assemblyStatusTone(task.status)}>{assemblyStatusLabel(task.status)}</Badge>
              </div>
            ))}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Activity history">
        <ActivityList items={activity.data ?? []} loading={activity.isLoading} />
      </SectionCard>

      <SectionCard title="Reset password">
        <form onSubmit={(event) => void onResetPassword(event)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
