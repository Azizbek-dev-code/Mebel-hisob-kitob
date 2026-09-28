import {
  SMM_CONTENT_STATUS_LABELS,
  SMM_PROGRESS_STATUS_GROUP_LABELS,
  SmmProgressStatusGroup,
} from '@furniture-erp/shared';
import { FileBarChart } from 'lucide-react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';
import { formatMoney } from '@/utils/format';

import { useSmmProgress } from '../../hooks/use-smm';
import { useSmmProjectId } from '../project-context';

export function ReportsTab() {
  const projectId = useSmmProjectId();
  const progress = useSmmProgress(projectId);

  if (progress.isError) {
    return (
      <ErrorState
        title="Hisobot yuklanmadi"
        message={progress.error instanceof ApiClientError ? progress.error.message : 'Qayta urinib ko‘ring'}
        onRetry={() => void progress.refetch()}
      />
    );
  }

  if (progress.isLoading || !progress.data) {
    return <Skeleton className="h-48 w-full" />;
  }

  const stats = progress.data;
  if (stats.totalContent === 0) {
    return (
      <EmptyState
        icon={FileBarChart}
        title="Ma’lumot yo‘q"
        description="Kontent paydo bo‘lgach hisobot to‘ldiriladi"
      />
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Progress xulosa">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-input border border-line px-3 py-2">
            <p className="text-xs text-ink-muted">Jami kontent</p>
            <p className="text-lg font-semibold tabular-nums">{stats.totalContent}</p>
          </div>
          <div className="rounded-input border border-line px-3 py-2">
            <p className="text-xs text-ink-muted">Bu davrda nashr</p>
            <p className="text-lg font-semibold tabular-nums">{stats.publishedThisPeriod}</p>
          </div>
          <div className="rounded-input border border-line px-3 py-2">
            <p className="text-xs text-ink-muted">Jami xarajat</p>
            <p className="text-lg font-semibold tabular-nums">{formatMoney(stats.totalCost)}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Guruhlar bo‘yicha">
        <ul className="space-y-2">
          {(Object.keys(SMM_PROGRESS_STATUS_GROUP_LABELS) as Array<keyof typeof SMM_PROGRESS_STATUS_GROUP_LABELS>).map(
            (group) => {
              const count = stats.byGroup[group as typeof SmmProgressStatusGroup.IDEATION] ?? 0;
              const pct = stats.totalContent ? Math.round((count / stats.totalContent) * 100) : 0;
              return (
                <li key={group}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-ink">{SMM_PROGRESS_STATUS_GROUP_LABELS[group]}</span>
                    <span className="tabular-nums text-ink-muted">
                      {count} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            },
          )}
        </ul>
      </SectionCard>

      <SectionCard title="Holatlar">
        <ul className="grid gap-2 sm:grid-cols-2">
          {stats.byStatus.map((bucket) => (
            <li
              key={bucket.status}
              className="flex items-center justify-between rounded-input border border-line px-3 py-2 text-sm"
            >
              <span>{SMM_CONTENT_STATUS_LABELS[bucket.status]}</span>
              <span className="font-semibold tabular-nums">{bucket.count}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
