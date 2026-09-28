import {
  FeatureKey,
  SMM_PROGRESS_KPI_LABELS,
  SmmContentType,
  mapSmmProgressToKpis,
  type SmmContentType as SmmContentTypeT,
} from '@furniture-erp/shared';
import { CalendarDays, LayoutTemplate, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { cn } from '@/lib/cn';

import { ContentCalendarMonth } from '../../components/ContentCalendarMonth';
import { ContentFormDialog } from '../../components/ContentFormDialog';
import { TemplatePickerDialog } from '../../components/TemplatePickerDialog';
import { useSmmCalendar, useSmmProgress } from '../../hooks/use-smm';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  dayKeyFromDate,
  monthBounds,
  weekBounds,
} from '../../utils/ui';
import { useSmmProjectId } from '../project-context';
import type { SmmCalendarView } from '@/services/smm.service';

const VIEWS: { key: SmmCalendarView; label: string }[] = [
  { key: 'month', label: 'Oy' },
  { key: 'week', label: 'Hafta' },
  { key: 'day', label: 'Kun' },
  { key: 'list', label: 'Ro‘yxat' },
];

export function CalendarTab() {
  const projectId = useSmmProjectId();
  const navigate = useNavigate();
  const todayKey = dayKeyFromDate(new Date());
  const [monthKey, setMonthKey] = useState(todayKey.slice(0, 7));
  const [view, setView] = useState<SmmCalendarView>('month');
  const [selectedDay, setSelectedDay] = useState<string | null>(todayKey);
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<SmmContentTypeT>(SmmContentType.REELS);
  const [templateOpen, setTemplateOpen] = useState(false);

  const range = useMemo(() => {
    if (view === 'week' && selectedDay) return weekBounds(selectedDay);
    if (view === 'day' && selectedDay) return { from: selectedDay, to: selectedDay };
    return monthBounds(monthKey);
  }, [view, selectedDay, monthKey]);

  const calendar = useSmmCalendar(projectId, { view, from: range.from, to: range.to });
  const progress = useSmmProgress(projectId);
  const items = calendar.data?.items ?? [];
  const kpis = useMemo(
    () => (progress.data ? mapSmmProgressToKpis(progress.data) : null),
    [progress.data],
  );

  function openCreate(type: SmmContentTypeT) {
    setCreateType(type);
    setCreateOpen(true);
  }

  return (
    <div className="space-y-4">
      {kpis ? (
        <div className="grid gap-2 sm:grid-cols-5">
          {(['planned', 'inProgress', 'completed', 'published', 'overdue'] as const).map((key) => (
            <div key={key} className="rounded-input border border-line bg-surface-muted px-3 py-2">
              <p className="text-xs text-ink-muted">{SMM_PROGRESS_KPI_LABELS[key]}</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-ink">{kpis[key]}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 rounded-input border border-line bg-surface-muted p-1">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              className={cn(
                'rounded-[0.4rem] px-3 py-1.5 text-sm font-medium',
                view === v.key ? 'bg-surface text-brand-700 shadow-card' : 'text-ink-soft',
              )}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <WriteGuard feature={FeatureKey.SMM_PROJECTS} className={BTN_SECONDARY} onClick={() => setTemplateOpen(true)}>
            <LayoutTemplate className="size-4" />
            Shablon
          </WriteGuard>
          <WriteGuard feature={FeatureKey.SMM_PROJECTS} className={BTN_PRIMARY} onClick={() => openCreate(SmmContentType.REELS)}>
            <Plus className="size-4" />
            Reels
          </WriteGuard>
          <WriteGuard feature={FeatureKey.SMM_PROJECTS} className={BTN_PRIMARY} onClick={() => openCreate(SmmContentType.STORY)}>
            Story
          </WriteGuard>
          <WriteGuard feature={FeatureKey.SMM_PROJECTS} className={BTN_PRIMARY} onClick={() => openCreate(SmmContentType.POST)}>
            Post
          </WriteGuard>
        </div>
      </div>

      {calendar.isError ? (
        <ErrorState
          title="Kalendar yuklanmadi"
          message={calendar.error instanceof ApiClientError ? calendar.error.message : 'Qayta urinib ko‘ring'}
          onRetry={() => void calendar.refetch()}
        />
      ) : calendar.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : view === 'month' ? (
        <SectionCard title="Kalendar" description="Kunga bosib Reels / Story / Post yarating">
          <ContentCalendarMonth
            projectId={projectId}
            monthKey={monthKey}
            items={items}
            selectedDay={selectedDay}
            todayKey={todayKey}
            onMonthChange={setMonthKey}
            onSelectDay={(day) => {
              setSelectedDay(day);
            }}
          />
          {selectedDay ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
              <span className="self-center text-sm text-ink-muted">{selectedDay} uchun:</span>
              <WriteGuard feature={FeatureKey.SMM_PROJECTS} className={BTN_SECONDARY} onClick={() => openCreate(SmmContentType.REELS)}>
                Reels
              </WriteGuard>
              <WriteGuard feature={FeatureKey.SMM_PROJECTS} className={BTN_SECONDARY} onClick={() => openCreate(SmmContentType.STORY)}>
                Story
              </WriteGuard>
              <WriteGuard feature={FeatureKey.SMM_PROJECTS} className={BTN_SECONDARY} onClick={() => openCreate(SmmContentType.POST)}>
                Post
              </WriteGuard>
            </div>
          ) : null}
        </SectionCard>
      ) : (
        <SectionCard
          title={view === 'list' ? 'Ro‘yxat' : view === 'week' ? 'Hafta' : 'Kun'}
          description={`${range.from} — ${range.to}`}
        >
          {items.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CalendarDays className="size-8 text-ink-soft" />
              <p className="mt-2 text-sm text-ink-muted">Bu davrda kontent yo‘q</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 py-2.5">
                  <button
                    type="button"
                    className="truncate text-left text-sm font-medium text-brand-700 hover:underline"
                    onClick={() => navigate(ROUTES.smmContentDetail(projectId, item.id))}
                  >
                    {item.publishAt?.slice(0, 10) ?? '—'} · {item.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      <ContentFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        defaultPublishAt={selectedDay}
        defaultContentType={createType}
        onCreated={(item) => navigate(ROUTES.smmContentDetail(projectId, item.id))}
      />
      <TemplatePickerDialog
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        projectId={projectId}
        publishAt={selectedDay}
        onApplied={(id) => navigate(ROUTES.smmContentDetail(projectId, id))}
      />
    </div>
  );
}
