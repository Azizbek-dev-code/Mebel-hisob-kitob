import { SMM_PROJECT_STATUS_LABELS } from '@furniture-erp/shared';
import { ArrowLeft } from 'lucide-react';
import { Link, Navigate, Outlet, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SegmentedNav } from '@/components/ui/SegmentedNav';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';

import { useSmmProject } from '../hooks/use-smm';
import { projectStatusTone, SMM_PROJECT_TABS } from '../utils/ui';

export function SmmProjectDetailPage() {
  const { projectId = '' } = useParams();
  const project = useSmmProject(projectId);

  if (!projectId) {
    return <Navigate to={ROUTES.smmProjects} replace />;
  }

  if (project.isError) {
    return (
      <PageContainer>
        <ErrorState
          title="Loyihani yuklab bo‘lmadi"
          message={
            project.error instanceof ApiClientError
              ? project.error.message
              : 'Qayta urinib ko‘ring'
          }
          onRetry={() => void project.refetch()}
        />
      </PageContainer>
    );
  }

  if (project.isLoading || !project.data) {
    return (
      <PageContainer className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-40 w-full" />
      </PageContainer>
    );
  }

  const data = project.data;
  const tabItems = SMM_PROJECT_TABS.map((tab) => ({
    to: ROUTES.smmProjectTab(projectId, tab.key),
    label: tab.label,
    end: true,
  }));

  return (
    <PageContainer className="space-y-4">
      <div className="space-y-3">
        <Link
          to={ROUTES.smmProjects}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          Loyihalar
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">{data.name}</h2>
              <Badge tone={projectStatusTone(data.status)}>
                {SMM_PROJECT_STATUS_LABELS[data.status]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {data.clientName || 'Mijoz ko‘rsatilmagan'}
              {data.description ? ` · ${data.description}` : ''}
            </p>
          </div>
        </div>
        <SegmentedNav items={tabItems} ariaLabel="Loyiha bo‘limlari" />
      </div>
      <Outlet context={{ projectId, project: data }} />
    </PageContainer>
  );
}
