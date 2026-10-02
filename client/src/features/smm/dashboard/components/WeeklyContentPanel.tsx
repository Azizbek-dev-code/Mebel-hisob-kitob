import type { SmmDashboardWeeklyDay } from '@furniture-erp/shared';
import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/feedback/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

export interface WeeklyContentPanelProps {
  days?: SmmDashboardWeeklyDay[];
  isLoading: boolean;
}

export function WeeklyContentPanel({ days, isLoading }: WeeklyContentPanelProps) {
  const { t } = useTranslation();
  const total = (days ?? []).reduce(
    (sum, day) => sum + day.reels + day.posts + day.stories + day.other,
    0,
  );

  return (
    <SectionCard
      title={t('smm.weeklyTitle')}
      description={t('smm.weeklyHint')}
      padded={false}
    >
      {isLoading && !days ? (
        <div className="grid grid-cols-7 gap-2 p-4 sm:p-5" aria-busy="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !days || days.length === 0 || total === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={t('smm.weeklyEmptyTitle')}
          description={t('smm.weeklyEmptyHint')}
        />
      ) : (
        <div className="grid grid-cols-7 gap-1.5 p-3 sm:gap-2 sm:p-5">
          {days.map((day) => {
            const dayTotal = day.reels + day.posts + day.stories + day.other;
            return (
              <div
                key={day.date}
                className={cn(
                  'rounded-input border px-1.5 py-2 text-center sm:px-2',
                  day.isToday
                    ? 'border-brand-300 bg-brand-50 ring-1 ring-brand-200'
                    : 'border-line bg-surface',
                )}
              >
                <p
                  className={cn(
                    'text-[10px] font-medium uppercase tracking-wide sm:text-xs',
                    day.isToday ? 'text-brand-700' : 'text-ink-muted',
                  )}
                >
                  {day.label}
                </p>
                <p
                  className={cn(
                    'mt-1 text-lg font-semibold tabular-nums sm:text-xl',
                    dayTotal > 0 ? 'text-ink' : 'text-ink-subtle',
                  )}
                >
                  {dayTotal}
                </p>
                {dayTotal > 0 ? (
                  <p className="mt-1 hidden text-[10px] leading-tight text-ink-subtle sm:block">
                    {[
                      day.reels > 0 ? `${day.reels}R` : null,
                      day.posts > 0 ? `${day.posts}P` : null,
                      day.stories > 0 ? `${day.stories}S` : null,
                      day.other > 0 ? `${day.other}+` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
