import {
  GrowthHabitProgressPeriod,
  MIN_WEEKDAY_SAMPLE,
  addDayKey,
  type HabitProgressResponse,
} from '@furniture-erp/shared';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import { ConsistencyHeatmap, WeeklyRhythmChart } from '../components/HabitCharts';
import { formatPct } from '../components/habit-ui';
import { useGrowthHabits, useGrowthHabitsProgress } from '../hooks/use-growth-habits';

type RangePreset = '7' | '28' | '90' | '180' | '365' | 'custom';
type ListTab = 'habits' | 'areas';

const RANGE_PRESETS: Array<{ id: RangePreset; labelKey: string }> = [
  { id: '7', labelKey: 'personal.habitRange.7' },
  { id: '28', labelKey: 'personal.habitRange.28' },
  { id: '90', labelKey: 'personal.habitRange.90' },
  { id: '180', labelKey: 'personal.habitRange.180' },
  { id: '365', labelKey: 'personal.habitRange.365' },
  { id: 'custom', labelKey: 'personal.habitRange.custom' },
];

function rollingQuery(todayKey: string, days: number) {
  return {
    period: GrowthHabitProgressPeriod.CUSTOM,
    from: addDayKey(todayKey, -(days - 1)),
    to: todayKey,
  } as const;
}

function buildProgressQuery(
  todayKey: string | undefined,
  range: RangePreset,
  customFrom: string,
  customTo: string,
  category: string,
) {
  const base = { includeArchived: true as const, category: category || undefined };
  if (!todayKey) {
    return { ...base, period: GrowthHabitProgressPeriod.MONTH };
  }
  if (range === '7') return { ...base, ...rollingQuery(todayKey, 7) };
  if (range === '28') return { ...base, ...rollingQuery(todayKey, 28) };
  if (range === '90') return { ...base, period: GrowthHabitProgressPeriod.QUARTER };
  if (range === '180') return { ...base, period: GrowthHabitProgressPeriod.HALF };
  if (range === '365') return { ...base, period: GrowthHabitProgressPeriod.YEAR };
  if (customFrom && customTo && customFrom <= customTo) {
    return {
      ...base,
      period: GrowthHabitProgressPeriod.CUSTOM,
      from: customFrom,
      to: customTo,
    };
  }
  return { ...base, ...rollingQuery(todayKey, 28) };
}

export function PersonalGrowthHabitsProgressPage() {
  const { t } = useTranslation();
  const habitsBootstrap = useGrowthHabits(false);
  const todayKey = habitsBootstrap.data?.todayKey;

  const [category, setCategory] = useState('');
  const [range, setRange] = useState<RangePreset>('28');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [tab, setTab] = useState<ListTab>('habits');
  const [search, setSearch] = useState('');

  const query = useMemo(
    () => buildProgressQuery(todayKey, range, customFrom, customTo, category),
    [todayKey, range, customFrom, customTo, category],
  );
  const progress = useGrowthHabitsProgress(query);
  const data = progress.data;

  const categories = data?.availableCategories ?? [];
  const filteredHabits = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.habits;
    return data.habits.filter((row) => row.title.toLowerCase().includes(q));
  }, [data, search]);

  const hasHabits = (data?.habits.length ?? 0) > 0 || (data?.availableCategories.length ?? 0) > 0;
  const scheduledInRange = (data?.overall.scheduled ?? 0) > 0;
  const overallScore =
    data && data.overall.scheduled > 0 ? data.overall.consistency : null;
  const mom = data?.analytics.monthOverMonth;
  const showDelta =
    mom != null &&
    mom.currentScheduled >= MIN_WEEKDAY_SAMPLE &&
    mom.previousScheduled >= MIN_WEEKDAY_SAMPLE;

  return (
    <div className="space-y-5 overflow-x-hidden">
      <PageHeader
        title={t('personal.habitProgressTitle')}
        backTo={ROUTES.personalGrowthHabits}
        backLabel={t('personal.habitTitle')}
      />
      <h1 className="-mt-3 text-lg font-semibold tracking-tight text-ink">
        {t('personal.habitProgressTitle')}
      </h1>

      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="habit-progress-category">
          {t('personal.habitFilterAll')}
        </label>
        <select
          id="habit-progress-category"
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink sm:flex-none"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">{t('personal.habitFilterAll')}</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {t(`personal.habitCategory.${value}`, { defaultValue: value })}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="habit-progress-range">
          {t('personal.habitRange.28')}
        </label>
        <select
          id="habit-progress-range"
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink sm:flex-none"
          value={range}
          onChange={(event) => setRange(event.target.value as RangePreset)}
        >
          {RANGE_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {t(preset.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {range === 'custom' ? (
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
            value={customFrom}
            onChange={(event) => setCustomFrom(event.target.value)}
            aria-label={t('personal.habitRangeFrom')}
          />
          <input
            type="date"
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
            value={customTo}
            onChange={(event) => setCustomTo(event.target.value)}
            aria-label={t('personal.habitRangeTo')}
          />
        </div>
      ) : null}

      {progress.isPending && !data ? (
        <Skeleton className="h-48 w-full" />
      ) : progress.isError ? (
        <ErrorState
          title={t('personal.habitLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void progress.refetch()}
        />
      ) : !data || (!hasHabits && data.habits.length === 0 && categories.length === 0) ? (
        <EmptyPanel
          title={t('personal.habitProgressEmptyTitle')}
          body={t('personal.habitProgressEmptyBody')}
          action={
            <Link to={ROUTES.personalGrowthHabits} className="text-sm font-medium text-brand-700">
              {t('personal.habitProgressEmptyCta')}
            </Link>
          }
        />
      ) : !scheduledInRange ? (
        <EmptyPanel title={t('personal.habitProgressNoScheduled')} body={t('personal.habitProgressNoScheduledBody')} />
      ) : (
        <>
          <section className="rounded-2xl bg-surface px-4 py-5 ring-1 ring-line">
            <p className="text-4xl font-semibold tracking-tight tabular-nums text-ink">
              {overallScore == null ? t('personal.habitNa') : formatPct(overallScore)}
            </p>
            <p className="mt-1 text-sm text-ink-muted">{t('personal.habitOverallConsistency')}</p>
            {showDelta && mom ? (
              <p
                className={cn(
                  'mt-2 text-sm font-medium',
                  mom.delta >= 0 ? 'text-success-700' : 'text-danger-600',
                )}
              >
                {t('personal.habitConsistencyDelta', {
                  delta: `${mom.delta >= 0 ? '↑' : '↓'} ${formatPct(Math.abs(mom.delta))}`,
                })}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl bg-surface p-4 ring-1 ring-line">
            <ConsistencyHeatmap days={data.dayPerformance} />
          </section>

          <PerformanceBreakdown data={data} />

          <section className="rounded-2xl bg-surface p-4 ring-1 ring-line">
            <WeeklyRhythmChart days={data.weeklyRhythm} />
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl bg-surface-muted p-1">
                {(['habits', 'areas'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium',
                      tab === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted',
                    )}
                    onClick={() => setTab(value)}
                  >
                    {t(value === 'habits' ? 'personal.habitTabHabits' : 'personal.habitTabAreas')}
                  </button>
                ))}
              </div>
              {tab === 'habits' ? (
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('personal.habitSearch')}
                  className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
                />
              ) : null}
            </div>

            {tab === 'habits' ? (
              <HabitsTable rows={filteredHabits} />
            ) : (
              <AreasList areas={data.areas} />
            )}
          </section>

          <AttentionBlock items={data.attentionHabits} />

          <FocusZonesBlock zones={data.focusZones} />

          <InsightsBlock data={data} />
        </>
      )}
    </div>
  );
}

function EmptyPanel({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-muted">{body}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function PerformanceBreakdown({ data }: { data: HabitProgressResponse }) {
  const { t } = useTranslation();
  const items = [
    { label: t('personal.habitBreakdownFull'), value: data.performanceBreakdown.full },
    { label: t('personal.habitBreakdownPartial'), value: data.performanceBreakdown.partial },
    { label: t('personal.habitBreakdownMissed'), value: data.performanceBreakdown.missed },
    { label: t('personal.habitBreakdownNoPlan'), value: data.performanceBreakdown.noPlan },
  ];
  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl bg-surface px-3 py-3 ring-1 ring-line">
          <p className="text-xl font-semibold tabular-nums text-ink">{item.value}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{item.label}</p>
        </div>
      ))}
    </section>
  );
}

function HabitsTable({ rows }: { rows: HabitProgressResponse['habits'] }) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return <p className="text-sm text-ink-muted">{t('personal.habitNoData')}</p>;
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line">
      <li className="hidden grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] gap-2 bg-surface-muted px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-ink-soft sm:grid">
        <span>{t('personal.habitColHabit')}</span>
        <span>{t('personal.habitColScore')}</span>
        <span>{t('personal.habitColCompleted')}</span>
        <span>{t('personal.habitColStreak')}</span>
        <span>{t('personal.habitColConsistency')}</span>
      </li>
      {rows.map((row) => {
        const score = row.kpi.scheduled === 0 ? null : row.kpi.completion;
        const consistency = row.kpi.scheduled === 0 ? null : row.kpi.consistency;
        return (
          <li key={row.habitId}>
            <Link
              to={ROUTES.personalGrowthHabitDetail(row.habitId)}
              className="block bg-surface px-3 py-3 transition-colors hover:bg-surface-hover"
            >
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] sm:items-center sm:gap-2">
                <p className="truncate text-sm font-medium text-ink">{row.title}</p>
                <p className="text-sm tabular-nums text-ink sm:text-ink">
                  <span className="mr-2 text-ink-soft sm:hidden">{t('personal.habitColScore')}</span>
                  {score == null ? t('personal.habitNa') : formatPct(score)}
                </p>
                <p className="text-sm tabular-nums text-ink-muted">
                  <span className="mr-2 sm:hidden">{t('personal.habitColCompleted')}</span>
                  {row.kpi.completed} / {row.kpi.scheduled}
                </p>
                <p className="text-sm tabular-nums text-ink-muted">
                  <span className="mr-2 sm:hidden">{t('personal.habitColStreak')}</span>
                  {t('personal.habitStreakDays', { count: row.kpi.currentStreak })}
                </p>
                <p className="text-sm tabular-nums text-ink-muted">
                  <span className="mr-2 sm:hidden">{t('personal.habitColConsistency')}</span>
                  {consistency == null ? t('personal.habitNa') : formatPct(consistency)}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function AreasList({ areas }: { areas: HabitProgressResponse['areas'] }) {
  const { t } = useTranslation();
  if (areas.length === 0) {
    return <p className="text-sm text-ink-muted">{t('personal.habitNoData')}</p>;
  }
  return (
    <ul className="space-y-2">
      {areas.map((area) => (
        <li key={area.category} className="rounded-2xl bg-surface px-3 py-3 ring-1 ring-line">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">
                {t(`personal.habitCategory.${area.category}`, { defaultValue: area.category })}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {t('personal.habitAreaHabits', { count: area.habitCount })}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">
              {area.consistency == null ? t('personal.habitNa') : formatPct(area.consistency)}
            </p>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {t('personal.habitAreaCompleted', { done: area.completed, total: area.scheduled })}
          </p>
        </li>
      ))}
    </ul>
  );
}

function AttentionBlock({ items }: { items: HabitProgressResponse['attentionHabits'] }) {
  const { t } = useTranslation();
  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <h2 className="text-sm font-semibold text-ink">{t('personal.habitAttentionTitle')}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">{t('personal.habitNa')}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.habitId}>
              <Link
                to={ROUTES.personalGrowthHabitDetail(item.habitId)}
                className="flex items-center justify-between gap-3 rounded-xl px-1 py-1 hover:bg-surface-hover"
              >
                <span className="truncate text-sm text-ink">{item.title}</span>
                <span className="shrink-0 text-sm tabular-nums text-ink-muted">
                  {t('personal.habitAttentionMissed', { count: item.missed })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FocusZonesBlock({ zones }: { zones: HabitProgressResponse['focusZones'] }) {
  const { t } = useTranslation();
  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <h2 className="text-sm font-semibold text-ink">{t('personal.habitFocusZonesTitle')}</h2>
      {zones == null || zones.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">{t('personal.habitNa')}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {zones.map((zone) => (
            <li key={zone.bucket} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink">{t(`personal.habitTimeOfDay.${zone.bucket}`)}</span>
              <span className="tabular-nums text-ink-muted">{formatPct(zone.share)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function InsightsBlock({ data }: { data: HabitProgressResponse }) {
  const { t } = useTranslation();
  const insights = data.analytics.insights;
  const bestHabit =
    data.habits
      .filter((row) => row.kpi.scheduled > 0)
      .sort((a, b) => b.kpi.consistency - a.kpi.consistency)[0] ?? null;
  const topMissed = data.attentionHabits[0] ?? null;

  const lines: string[] = [];
  if (bestHabit && bestHabit.kpi.scheduled >= MIN_WEEKDAY_SAMPLE) {
    lines.push(
      t('personal.habitInsightBestHabit', {
        title: bestHabit.title,
        rate: formatPct(bestHabit.kpi.consistency),
      }),
    );
  }
  if (topMissed) {
    lines.push(
      t('personal.habitInsightMostMissed', {
        title: topMissed.title,
        count: topMissed.missed,
      }),
    );
  }
  for (const insight of insights.slice(0, 2)) {
    lines.push(t(`personal.habitInsight.${insight.code}`));
  }

  if (lines.length === 0) return null;

  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <h2 className="text-sm font-semibold text-ink">{t('personal.habitInsightsTitle')}</h2>
      <ul className="mt-2 space-y-1.5 text-sm text-ink">
        {lines.map((line, index) => (
          <li key={`${line}-${index}`}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
