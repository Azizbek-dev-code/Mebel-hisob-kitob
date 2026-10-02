import type { SmmDashboardActivityItem } from '@furniture-erp/shared';
import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelativeTime } from '@/utils/format';

export interface RecentActivityPanelProps {
  items?: SmmDashboardActivityItem[];
  isLoading: boolean;
}

export function RecentActivityPanel({ items, isLoading }: RecentActivityPanelProps) {
  const { t } = useTranslation();

  return (
    <SectionCard
      title={t('smm.activityTitle')}
      description={t('smm.activityHint')}
      padded={false}
    >
      {isLoading && !items ? (
        <div className="space-y-3 p-4 sm:p-5" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={t('smm.activityEmptyTitle')}
          description={t('smm.activityEmptyHint')}
        />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.href}
                className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-hover/60 sm:px-5"
              >
                <span className="min-w-0">
                  <span className="block text-sm text-ink">{item.summary}</span>
                  <span className="mt-0.5 block truncate text-xs text-ink-muted">
                    {item.projectName}
                    {item.actorName ? ` · ${item.actorName}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-ink-subtle">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
