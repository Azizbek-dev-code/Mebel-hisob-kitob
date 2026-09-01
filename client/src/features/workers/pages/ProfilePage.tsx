import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ResponsibilityBadges } from '@/features/workers/components/ResponsibilityBadges';
import { WorkerProfileModulesPanel } from '@/features/workers/components/WorkerProfileModulesPanel';
import { useMyProfileModules } from '@/features/workers/hooks/use-workers';
import { ROUTES } from '@/routes/paths';
import { formatDate } from '@/utils/format';

export function ProfilePage() {
  const modulesQuery = useMyProfileModules();

  if (modulesQuery.isError && !modulesQuery.data) {
    return (
      <PageContainer>
        <ErrorState
          title="Profil yuklanmadi"
          message={
            modulesQuery.error instanceof Error
              ? modulesQuery.error.message
              : "Profil ma'lumotlarini yuklab bo'lmadi."
          }
          retryLabel="Qayta urinish"
          onRetry={() => void modulesQuery.refetch()}
        />
      </PageContainer>
    );
  }

  if (modulesQuery.isLoading || !modulesQuery.data) {
    return (
      <PageContainer>
        <Skeleton className="h-48 w-full" />
      </PageContainer>
    );
  }

  const modules = modulesQuery.data;
  const worker = modules.worker;

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">{worker.fullName}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            @{worker.username ?? '—'}
            {worker.phone ? ` · ${worker.phone}` : ''} · {formatDate(worker.createdAt)}
          </p>
          <div className="mt-2">
            <ResponsibilityBadges responsibilities={worker.responsibilities} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={worker.isActive ? 'success' : 'neutral'}>
            {worker.isActive ? 'Faol' : 'Nofaol'}
          </Badge>
          <Link
            to={ROUTES.profileFinances}
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Moliyaviy hisob
          </Link>
        </div>
      </div>

      <SectionCard title="Profil modullari" description="Mas’uliyat bo‘yicha ko‘rsatkichlar">
        <WorkerProfileModulesPanel
          modules={modules}
          isLoading={modulesQuery.isLoading}
          isError={modulesQuery.isError}
          onRetry={() => void modulesQuery.refetch()}
        />
      </SectionCard>
    </PageContainer>
  );
}
