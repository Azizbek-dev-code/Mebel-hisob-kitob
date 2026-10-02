import {
  SMM_CONTENT_STATUS_LABELS,
  SmmContentStatus,
  type SmmDashboardContentPipelineBucket,
} from '@furniture-erp/shared';
import { Clapperboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/feedback/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

export interface ContentPipelinePanelProps {
  buckets?: SmmDashboardContentPipelineBucket[];
  isLoading: boolean;
}

/** Primary pipeline stages shown left-to-right (Idea → … → Published). */
const PIPELINE_ORDER: SmmContentStatus[] = [
  SmmContentStatus.IDEA,
  SmmContentStatus.PLANNED,
  SmmContentStatus.BRIEF,
  SmmContentStatus.SCRIPT_COPY,
  SmmContentStatus.PRODUCTION,
  SmmContentStatus.INTERNAL_REVIEW,
  SmmContentStatus.CLIENT_REVIEW,
  SmmContentStatus.APPROVED,
  SmmContentStatus.SCHEDULED,
  SmmContentStatus.PUBLISHED,
];

export function ContentPipelinePanel({ buckets, isLoading }: ContentPipelinePanelProps) {
  const { t } = useTranslation();
  const countByStatus = new Map((buckets ?? []).map((b) => [b.status, b.count]));
  const total = (buckets ?? []).reduce((sum, b) => sum + b.count, 0);

  return (
    <SectionCard
      title={t('smm.pipelineTitle')}
      description={t('smm.pipelineHint')}
      padded={false}
    >
      {isLoading && !buckets ? (
        <div className="space-y-3 p-4 sm:p-5" aria-busy="true">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title={t('smm.pipelineEmptyTitle')}
          description={t('smm.pipelineEmptyHint')}
        />
      ) : (
        <div className="p-4 sm:p-5">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {PIPELINE_ORDER.map((status, index) => {
              const count = countByStatus.get(status) ?? 0;
              return (
                <div key={status} className="flex min-w-[4.5rem] flex-1 flex-col items-stretch gap-1">
                  <div
                    className={cn(
                      'rounded-input border px-2 py-2 text-center',
                      count > 0
                        ? 'border-brand-200 bg-brand-50'
                        : 'border-line bg-surface-muted',
                    )}
                  >
                    <p className="text-base font-semibold tabular-nums text-ink">{count}</p>
                    <p className="mt-0.5 truncate text-[10px] leading-tight text-ink-muted">
                      {SMM_CONTENT_STATUS_LABELS[status]}
                    </p>
                  </div>
                  {index < PIPELINE_ORDER.length - 1 ? (
                    <span className="mx-auto hidden text-ink-subtle sm:block" aria-hidden="true">
                      →
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {(buckets ?? [])
              .filter((b) => b.count > 0)
              .map((bucket) => (
                <li
                  key={bucket.status}
                  className="flex items-center justify-between rounded-input border border-line px-2.5 py-1.5 text-xs"
                >
                  <span className="text-ink-soft">
                    {SMM_CONTENT_STATUS_LABELS[bucket.status as SmmContentStatus] ??
                      bucket.status}
                  </span>
                  <span className="font-semibold tabular-nums text-ink">{bucket.count}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
