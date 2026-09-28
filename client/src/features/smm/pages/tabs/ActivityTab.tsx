import { Activity } from 'lucide-react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';
import { formatDateTime } from '@/utils/format';

import { useSmmActivity } from '../../hooks/use-smm';
import { BTN_SECONDARY } from '../../utils/ui';
import { useSmmProjectId } from '../project-context';

export function ActivityTab() {
  const projectId = useSmmProjectId();
  const activity = useSmmActivity(projectId, { pageSize: 50 });
  const meta = activity.data?.meta;

  return (
    <div className="space-y-4">
      {activity.isError ? (
        <ErrorState
          title="Faoliyat yuklanmadi"
          message={activity.error instanceof ApiClientError ? activity.error.message : 'Qayta urinib ko‘ring'}
          onRetry={() => void activity.refetch()}
        />
      ) : activity.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (activity.data?.items ?? []).length === 0 ? (
        <EmptyState icon={Activity} title="Faoliyat yo‘q" description="Loyihada hali o‘zgarishlar yo‘q" />
      ) : (
        <SectionCard title="Faoliyat jurnali">
          <ul className="divide-y divide-line">
            {(activity.data?.items ?? []).map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-ink">{item.summary}</p>
                  <p className="text-xs text-ink-muted">
                    {item.actor?.fullName ?? 'Tizim'} · {item.entityType} · {item.eventType}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-ink-soft">{formatDateTime(item.createdAt)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {meta && meta.totalPages > 1 ? (
        <p className="text-center text-sm text-ink-muted">
          Sahifa {meta.page} / {meta.totalPages}
        </p>
      ) : null}

      {activity.isFetching ? (
        <button type="button" className={BTN_SECONDARY} onClick={() => void activity.refetch()}>
          Yangilash
        </button>
      ) : null}
    </div>
  );
}
