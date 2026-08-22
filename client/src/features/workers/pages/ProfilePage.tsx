import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ResponsibilityBadges } from '@/features/workers/components/ResponsibilityBadges';
import { WorkerStatsGrid } from '@/features/workers/components/WorkerStatsGrid';
import { useMyActivity, useMyProfile } from '@/features/workers/hooks/use-workers';
import { WORKER_ACTIVITY_LABELS } from '@furniture-erp/shared';
import { formatDate, formatDateTime } from '@/utils/format';

export function ProfilePage() {
  const profile = useMyProfile();
  const activity = useMyActivity();

  if (profile.isError) {
    return (
      <PageContainer>
        <ErrorState
          title="Could not load profile"
          message={profile.error instanceof Error ? profile.error.message : 'Try again.'}
          onRetry={() => void profile.refetch()}
        />
      </PageContainer>
    );
  }

  if (profile.isLoading || !profile.data) {
    return (
      <PageContainer>
        <Skeleton className="h-48 w-full" />
      </PageContainer>
    );
  }

  const worker = profile.data;

  return (
    <PageContainer className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">{worker.fullName}</h2>
        <p className="mt-1 text-sm text-ink-muted">Your worker profile and activity summary.</p>
      </div>

      <SectionCard
        title="Profile"
        action={
          <Badge tone={worker.isActive ? 'success' : 'neutral'}>
            {worker.isActive ? 'Active' : 'Inactive'}
          </Badge>
        }
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Username</dt>
            <dd className="font-medium text-ink">{worker.username ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Phone</dt>
            <dd className="text-ink">{worker.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Joined</dt>
            <dd className="text-ink">{formatDate(worker.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Responsibilities</dt>
            <dd className="mt-1">
              <ResponsibilityBadges responsibilities={worker.responsibilities} />
            </dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Activity summary">
        <WorkerStatsGrid
          stats={worker.stats}
          keys={[
            'totalSales',
            'totalAssemblyTasks',
            'completedAssemblyTasks',
            'pendingAssemblyTasks',
          ]}
        />
      </SectionCard>

      <SectionCard title="Recent activity">
        {activity.data && activity.data.length === 0 ? (
          <p className="text-sm text-ink-muted">No activity yet.</p>
        ) : null}
        <ul className="space-y-3">
          {(activity.data ?? []).slice(0, 20).map((item) => (
            <li key={item.id} className="border-b border-line pb-3 last:border-0">
              <p className="text-sm font-medium text-ink">{WORKER_ACTIVITY_LABELS[item.type]}</p>
              <p className="text-sm text-ink-muted">{item.message ?? '—'}</p>
              <p className="text-xs text-ink-subtle">{formatDateTime(item.createdAt)}</p>
            </li>
          ))}
        </ul>
      </SectionCard>
    </PageContainer>
  );
}
