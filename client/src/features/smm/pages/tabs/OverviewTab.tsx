import {
  SMM_CONTENT_STATUS_LABELS,
  SMM_PROGRESS_KPI_LABELS,
  mapSmmProgressToKpis,
} from '@furniture-erp/shared';
import { Activity, AlertTriangle, CheckCircle2, Clapperboard, Clock, PlayCircle, Rocket } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { formatDateTime, formatMoney } from '@/utils/format';

import { useSmmActivity, useSmmProgress } from '../../hooks/use-smm';
import { useSmmProjectId } from '../project-context';

export function OverviewTab() {
  const projectId = useSmmProjectId();
  const progress = useSmmProgress(projectId);
  const activity = useSmmActivity(projectId, { pageSize: 8 });

  const kpis = useMemo(
    () => (progress.data ? mapSmmProgressToKpis(progress.data) : null),
    [progress.data],
  );

  if (progress.isError) {
    return (
      <ErrorState
        title="Progress yuklanmadi"
        message={progress.error instanceof ApiClientError ? progress.error.message : 'Qayta urinib ko‘ring'}
        onRetry={() => void progress.refetch()}
      />
    );
  }

  const stats = progress.data;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          title={SMM_PROGRESS_KPI_LABELS.planned}
          value={kpis ? String(kpis.planned) : '—'}
          context="G‘oya / brif / reja"
          icon={Clapperboard}
          isLoading={progress.isLoading}
        />
        <KpiCard
          title={SMM_PROGRESS_KPI_LABELS.inProgress}
          value={kpis ? String(kpis.inProgress) : '—'}
          context="Ishlab chiqarish + tekshiruv"
          icon={PlayCircle}
          tone="brand"
          isLoading={progress.isLoading}
        />
        <KpiCard
          title={SMM_PROGRESS_KPI_LABELS.completed}
          value={kpis ? String(kpis.completed) : '—'}
          context="Tasdiqlangan / rejalashtirilgan"
          icon={CheckCircle2}
          tone="success"
          isLoading={progress.isLoading}
        />
        <KpiCard
          title={SMM_PROGRESS_KPI_LABELS.published}
          value={kpis ? String(kpis.published) : '—'}
          context="Nashr / tahlil"
          icon={Rocket}
          isLoading={progress.isLoading}
        />
        <KpiCard
          title={SMM_PROGRESS_KPI_LABELS.overdue}
          value={kpis ? String(kpis.overdue) : '—'}
          context="Vazifa + tayinlash"
          icon={AlertTriangle}
          tone="danger"
          isLoading={progress.isLoading}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard
          title="Jami kontent"
          value={stats ? String(stats.totalContent) : '—'}
          context="Loyihadagi barcha kontent"
          icon={Clapperboard}
          isLoading={progress.isLoading}
        />
        <KpiCard
          title="Jami xarajat"
          value={stats ? formatMoney(stats.totalCost) : '—'}
          context="Hisoblangan xarajatlar"
          icon={Clock}
          isLoading={progress.isLoading}
        />
      </div>

      <SectionCard title="Holat bo‘yicha" description="Kontent statuslari">
        {progress.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : stats && stats.byStatus.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {stats.byStatus.map((bucket) => (
              <li
                key={bucket.status}
                className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-soft"
              >
                {SMM_CONTENT_STATUS_LABELS[bucket.status]}: {bucket.count}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">Hali kontent yo‘q</p>
        )}
      </SectionCard>

      <SectionCard
        title="So‘nggi faoliyat"
        action={
          <Link
            to={ROUTES.smmProjectTab(projectId, 'activity')}
            className="text-sm text-brand-700 hover:underline"
          >
            Barchasi
          </Link>
        }
      >
        {activity.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (activity.data?.items ?? []).length === 0 ? (
          <EmptyState icon={Activity} title="Faoliyat yo‘q" description="Hali hech narsa yozilmagan" />
        ) : (
          <ul className="divide-y divide-line">
            {(activity.data?.items ?? []).map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-ink">{item.summary}</p>
                  <p className="text-xs text-ink-muted">
                    {item.actor?.fullName ?? 'Tizim'} · {item.eventType}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-ink-soft">{formatDateTime(item.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
