import type { SmmDashboardTodayItem } from '@furniture-erp/shared';
import { CheckCircle2, ListTodo } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { formatDateTime } from '@/utils/format';

export interface TodayWorkPanelProps {
  items?: SmmDashboardTodayItem[];
  isLoading: boolean;
}

type SortMode = 'time' | 'priority';

const PRIORITY_RANK: Record<SmmDashboardTodayItem['priority'], number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export function TodayWorkPanel({ items, isLoading }: TodayWorkPanelProps) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<SortMode>('time');

  const sorted = useMemo(() => {
    const list = [...(items ?? [])];
    if (sort === 'priority') {
      list.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    }
    return list;
  }, [items, sort]);

  return (
    <SectionCard
      title={t('smm.todayWorkTitle')}
      description={t('smm.todayWorkHint')}
      action={
        <div className="flex items-center gap-2">
          <div className="flex rounded-input border border-line p-0.5">
            <SortButton active={sort === 'time'} onClick={() => setSort('time')}>
              {t('smm.sortByTime')}
            </SortButton>
            <SortButton active={sort === 'priority'} onClick={() => setSort('priority')}>
              {t('smm.sortByPriority')}
            </SortButton>
          </div>
          <Link
            to={ROUTES.smmProjects}
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            {t('smm.allTasksLink')}
          </Link>
        </div>
      }
      padded={false}
    >
      {isLoading && !items ? (
        <div className="space-y-3 p-4 sm:p-5" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={t('smm.todayWorkEmptyTitle')}
          description={t('smm.todayWorkEmptyHint')}
        />
      ) : (
        <ul className="divide-y divide-line">
          {sorted.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <Link
                to={item.href}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-hover/60 sm:px-5"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-input bg-surface-muted text-ink-soft">
                  <ListTodo className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">{item.title}</span>
                    {item.isOverdue ? (
                      <Badge tone="danger">{t('smm.overdue')}</Badge>
                    ) : (
                      <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-muted">
                    {item.projectName}
                    {item.assigneeName ? ` · ${item.assigneeName}` : ''}
                    {item.status ? ` · ${item.status}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-ink-subtle">
                  {item.deadline ? formatDateTime(item.deadline) : '—'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-[0.35rem] px-2 py-1 text-[11px] font-medium transition-colors',
        active ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

function priorityTone(priority: SmmDashboardTodayItem['priority']) {
  if (priority === 'HIGH') return 'danger' as const;
  if (priority === 'MEDIUM') return 'warning' as const;
  return 'neutral' as const;
}
