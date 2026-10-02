import type { SmmDashboardApprovalItem } from '@furniture-erp/shared';
import { FileCheck2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ClientApprovalsPanelProps {
  items?: SmmDashboardApprovalItem[];
  isLoading: boolean;
}

export function ClientApprovalsPanel({ items, isLoading }: ClientApprovalsPanelProps) {
  const { t } = useTranslation();

  return (
    <SectionCard
      title={t('smm.approvalsTitle')}
      description={t('smm.approvalsHint')}
      padded={false}
    >
      {isLoading && !items ? (
        <div className="space-y-3 p-4 sm:p-5" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title={t('smm.approvalsEmptyTitle')}
          description={t('smm.approvalsEmptyHint')}
        />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.approvalId}>
              <Link
                to={item.href}
                className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-hover/60 sm:px-5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {item.contentTitle}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-muted">
                    {item.projectName}
                    {item.clientName ? ` · ${item.clientName}` : ''}
                    {item.responsibleName ? ` · ${item.responsibleName}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs text-warning-700">
                  {formatWaiting(item.waitingHours, t)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function formatWaiting(
  hours: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (hours < 1) return t('smm.waitingMinutes', { count: Math.max(1, Math.round(hours * 60)) });
  if (hours < 48) return t('smm.waitingHours', { count: Math.round(hours) });
  return t('smm.waitingDays', { count: Math.round(hours / 24) });
}
