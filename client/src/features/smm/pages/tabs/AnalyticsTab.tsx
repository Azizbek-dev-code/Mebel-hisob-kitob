import { SmmContentStatus } from '@furniture-erp/shared';
import { BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';

import { ContentStatusBadge } from '../../components/ContentStatusBadge';
import { useSmmContentList } from '../../hooks/use-smm';
import { useSmmProjectId } from '../project-context';

export function AnalyticsTab() {
  const projectId = useSmmProjectId();
  const published = useSmmContentList(projectId, {
    status: SmmContentStatus.PUBLISHED,
    pageSize: 50,
  });
  const analyzed = useSmmContentList(projectId, {
    status: SmmContentStatus.ANALYZED,
    pageSize: 50,
  });

  const items = [...(published.data?.items ?? []), ...(analyzed.data?.items ?? [])];
  const loading = published.isLoading || analyzed.isLoading;
  const error = published.isError ? published.error : analyzed.isError ? analyzed.error : null;

  if (error) {
    return (
      <ErrorState
        title="Analitika yuklanmadi"
        message={error instanceof ApiClientError ? error.message : 'Qayta urinib ko‘ring'}
        onRetry={() => {
          void published.refetch();
          void analyzed.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Nashr etilgan kontent" description="Natijalarni kontent sahifasida kiriting">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Nashr etilgan kontent yo‘q"
            description="Nashrdan keyin metrikalarni qo‘lda kiriting"
          />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2.5">
                <Link
                  to={ROUTES.smmContentDetail(projectId, item.id)}
                  className="truncate text-sm font-medium text-brand-700 hover:underline"
                >
                  {item.title}
                </Link>
                <ContentStatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
