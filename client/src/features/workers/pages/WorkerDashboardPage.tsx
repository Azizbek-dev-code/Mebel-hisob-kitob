import { UserRole, WorkerResponsibility } from '@furniture-erp/shared';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { WorkerStatsGrid } from '@/features/workers/components/WorkerStatsGrid';
import { useMyStats } from '@/features/workers/hooks/use-workers';
import { ROUTES } from '@/routes/paths';

/**
 * Compact "My Work" dashboard for non-admin workers.
 * Metrics come only from real /me/stats calculations.
 */
export function WorkerDashboardPage() {
  const { data: user } = useCurrentUser();
  const stats = useMyStats();

  const showSales =
    user?.responsibilities.includes(WorkerResponsibility.SELLER) ||
    user?.role === UserRole.CASHIER;
  const showAssembly = user?.responsibilities.includes(WorkerResponsibility.ASSEMBLER);

  return (
    <PageContainer className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">
          Welcome{user ? `, ${user.fullName.split(' ')[0]}` : ''}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">Your work for today at {user?.storeName ?? 'the store'}.</p>
      </div>

      {stats.isError ? (
        <ErrorState
          title="Could not load your work summary"
          message={stats.error instanceof Error ? stats.error.message : 'Try again.'}
          onRetry={() => void stats.refetch()}
        />
      ) : null}

      {stats.isLoading || !stats.data ? <Skeleton className="h-40 w-full" /> : null}

      {stats.data ? (
        <WorkerStatsGrid
          stats={stats.data}
          keys={[
            ...(showAssembly
              ? (['pendingAssemblyTasks', 'completedTasksThisMonth'] as const)
              : []),
            ...(showSales ? (['salesToday', 'salesThisMonth'] as const) : []),
          ].flat()}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {showAssembly ? (
          <SectionCard title="Assembly">
            <p className="text-sm text-ink-muted">Open tasks assigned to you for terlash.</p>
            <Link
              to={ROUTES.assemblyTasks}
              className="mt-3 inline-flex text-sm font-medium text-brand-700 hover:underline"
            >
              My assembly tasks
            </Link>
          </SectionCard>
        ) : null}
        {showSales ? (
          <SectionCard title="Sales">
            <p className="text-sm text-ink-muted">Sales where you are recorded as the seller.</p>
            <Link
              to={ROUTES.mySales}
              className="mt-3 inline-flex text-sm font-medium text-brand-700 hover:underline"
            >
              My sales
            </Link>
          </SectionCard>
        ) : null}
        <SectionCard title="Profile">
          <p className="text-sm text-ink-muted">Responsibilities and activity summary.</p>
          <Link
            to={ROUTES.profile}
            className="mt-3 inline-flex text-sm font-medium text-brand-700 hover:underline"
          >
            Open profile
          </Link>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
