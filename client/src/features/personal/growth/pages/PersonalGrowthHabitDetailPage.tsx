import {
  GrowthHabitProgressPeriod,
  addDayKey,
  type GrowthHabitProgressPeriod as HabitPeriod,
} from '@furniture-erp/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import {
  HabitDailyProgressChart,
  HabitKpiGrid,
  HabitStreakHero,
  HabitSummaryStrip,
  HabitTrendBars,
} from '../components/HabitCharts';
import { HabitFormDialog } from '../components/HabitFormDialog';
import { HabitMonthCalendar } from '../components/HabitMonthCalendar';
import { formatNum, formatPct, habitIcon, isDurationHabit, remainingHabitMinutes } from '../components/habit-ui';
import {
  useAddGrowthHabitLog,
  useCheckInGrowthHabit,
  useClearGrowthHabitDay,
  useGrowthHabitDetail,
  useGrowthHabitStatistics,
  useGrowthHabits,
  useSkipGrowthHabit,
  useToggleHabitChecklist,
  useUpdateGrowthHabit,
} from '../hooks/use-growth-habits';

const CHART_PERIODS = [
  { id: 'DAY', period: GrowthHabitProgressPeriod.WEEK, daily: true },
  { id: 'WEEK', period: GrowthHabitProgressPeriod.WEEK, daily: true },
  { id: 'MONTH', period: GrowthHabitProgressPeriod.MONTH, daily: false },
  { id: 'YEAR', period: GrowthHabitProgressPeriod.YEAR, daily: false },
] as const;

export function PersonalGrowthHabitDetailPage() {
  const { t } = useTranslation();
  const { habitId } = useParams<{ habitId: string }>();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);
  const detail = useGrowthHabitDetail(habitId);
  const list = useGrowthHabits();
  const update = useUpdateGrowthHabit();
  const addLog = useAddGrowthHabitLog();
  const checkIn = useCheckInGrowthHabit();
  const clearDay = useClearGrowthHabitDay();
  const skip = useSkipGrowthHabit();
  const toggle = useToggleHabitChecklist();
  const [editOpen, setEditOpen] = useState(false);
  const [logValue, setLogValue] = useState('');
  const [chartPeriod, setChartPeriod] = useState<(typeof CHART_PERIODS)[number]['id']>('MONTH');
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [monthKey, setMonthKey] = useState<string | null>(null);

  const periodConfig = CHART_PERIODS.find((row) => row.id === chartPeriod) ?? CHART_PERIODS[2];
  const statsQuery = useMemo(
    () => ({ period: periodConfig.period as HabitPeriod }),
    [periodConfig.period],
  );
  const stats = useGrowthHabitStatistics(habitId, statsQuery);
  const monthStats = useGrowthHabitStatistics(habitId, {
    period: GrowthHabitProgressPeriod.MONTH,
  });

  const habit = detail.data?.habit;
  const activeStats = stats.data ?? detail.data?.statistics;
  const calendarStats = monthStats.data ?? detail.data?.statistics;
  const Icon = habitIcon(habit?.icon);
  const todayKey = activeStats?.todayKey ?? calendarStats?.todayKey ?? '';
  const viewDayKey = selectedDayKey ?? todayKey;
  const resolvedMonth = monthKey ?? (todayKey ? todayKey.slice(0, 7) : new Date().toISOString().slice(0, 7));

  return (
    <div className="space-y-5 overflow-x-hidden">
      <PageHeader
        title={habit?.title ?? t('personal.habitTitle')}
        backTo={ROUTES.personalGrowthHabits}
        backLabel={t('personal.habitTitle')}
      />
      {habit ? (
        <h1 className="-mt-3 text-lg font-semibold tracking-tight text-ink">{habit.title}</h1>
      ) : null}

      {detail.isPending && !detail.data ? (
        <Skeleton className="h-48 w-full" />
      ) : detail.isError ? (
        <ErrorState
          title={t('personal.habitLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void detail.refetch()}
        />
      ) : !habit || !activeStats ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-muted">
          {t('personal.habitEmpty')}
        </p>
      ) : (
        <>
          <section className="pf-card p-4">
            <div className="flex items-start gap-3">
              <span
                className="flex size-12 items-center justify-center rounded-2xl text-white"
                style={{ background: habit.color || '#064e3b' }}
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{habit.title}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {habit.kind === 'BAD' ? t('personal.habitKindBad') : t('personal.habitKindGood')}
                  {` · ${habit.targetValue} ${t(`personal.habitUnit.${habit.targetUnit}`, { defaultValue: habit.targetUnit })} / ${t(`personal.habitGoalPeriod.${habit.goalPeriod}`)}`}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  {habit.todayStatus === 'COMPLETED'
                    ? t('personal.habitTodayDone')
                    : habit.todayStatus === 'PARTIAL'
                      ? formatPct(habit.todayProgress)
                      : t('personal.habitTodayOpen')}
                  {` · ${t('personal.habitGoalProgress')}: ${formatPct(activeStats.kpi.goalProgress)}`}
                </p>
                {habit.notes ? <p className="mt-2 text-sm text-ink-muted">{habit.notes}</p> : null}
              </div>
              {canWrite ? (
                <button
                  type="button"
                  className="text-xs font-medium text-brand-700 hover:underline"
                  onClick={() => setEditOpen(true)}
                >
                  {t('personal.habitEdit')}
                </button>
              ) : null}
            </div>

            {canWrite && !habit.isArchived ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {isDurationHabit(habit) && habit.todayStatus !== 'COMPLETED' ? (
                  <Link
                    to={`${ROUTES.personalGrowthFocus}?habitId=${habit.id}&minutes=${remainingHabitMinutes(habit)}`}
                    className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    {t('personal.habitStartTimer')}
                  </Link>
                ) : habit.todayStatus === 'COMPLETED' || habit.todayStatus === 'SKIPPED' ? (
                  <button
                    type="button"
                    disabled={clearDay.isPending}
                    className="rounded-input border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-surface-hover"
                    onClick={() => void clearDay.mutateAsync({ id: habit.id })}
                  >
                    {t('personal.habitUncomplete')}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={checkIn.isPending}
                    className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                    onClick={() => void checkIn.mutateAsync({ id: habit.id })}
                  >
                    {t('personal.habitCheckIn')}
                  </button>
                )}
                {habit.dueToday && habit.todayStatus !== 'COMPLETED' && habit.todayStatus !== 'SKIPPED' ? (
                  <button
                    type="button"
                    className="rounded-input border border-line px-3 py-2 text-sm text-ink-muted hover:bg-surface-hover"
                    onClick={() => void skip.mutateAsync({ id: habit.id })}
                  >
                    {t('personal.habitSkip')}
                  </button>
                ) : null}
              </div>
            ) : null}

            {habit.checklist.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {habit.checklist.map((item) => (
                  <li key={item.id} className="flex min-w-0 items-center gap-2 text-xs">
                    <button
                      type="button"
                      disabled={!canWrite || habit.isArchived}
                      className={cn(
                        'size-4 shrink-0 rounded border',
                        item.doneToday ? 'border-brand-500 bg-brand-500' : 'border-line-strong',
                      )}
                      onClick={() =>
                        void toggle.mutateAsync({
                          id: habit.id,
                          body: { itemId: item.id, done: !item.doneToday },
                        })
                      }
                      aria-label={item.title}
                    />
                    <span className={cn('min-w-0 break-words', item.doneToday ? 'text-ink-muted line-through' : 'text-ink')}>
                      {item.title}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {canWrite && !habit.isArchived ? (
              <form
                className="mt-3 flex min-w-0 gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = Number(logValue);
                  if (!(value >= 0)) return;
                  void addLog.mutateAsync({ id: habit.id, body: { value } }).then(() => setLogValue(''));
                }}
              >
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="min-w-0 flex-1 rounded-input border border-line px-3 py-2 text-sm"
                  placeholder={t('personal.habitLogValue')}
                  value={logValue}
                  onChange={(e) => setLogValue(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={addLog.isPending}
                  className="shrink-0 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {t('personal.habitLogAdd')}
                </button>
              </form>
            ) : null}
            {habit.isArchived ? (
              <p className="mt-3 text-xs text-ink-muted">{t('personal.habitArchived')}</p>
            ) : canWrite ? (
              <button
                type="button"
                className="mt-3 text-xs text-ink-muted hover:underline"
                onClick={() => void update.mutateAsync({ id: habit.id, body: { isArchived: true } })}
              >
                {t('personal.habitArchive')}
              </button>
            ) : null}
          </section>

          <HabitSummaryStrip kpi={activeStats.kpi} unit={habit.targetUnit} />

          <div className="grid gap-4 lg:grid-cols-2">
            <HabitStreakHero
              currentStreak={activeStats.kpi.currentStreak}
              cells={calendarStats?.calendar ?? activeStats.calendar}
              todayKey={todayKey}
            />
            <section className="pf-card p-4">
              <HabitMonthCalendar
                cells={calendarStats?.calendar ?? activeStats.calendar}
                selectedDayKey={viewDayKey}
                todayKey={todayKey}
                monthKey={resolvedMonth}
                onMonthChange={(next) => {
                  setMonthKey(next);
                  setSelectedDayKey(`${next}-01`);
                }}
                onSelectDay={(day) => {
                  setSelectedDayKey(day);
                  setMonthKey(day.slice(0, 7));
                }}
                compact
              />
              {viewDayKey ? (
                <p className="mt-2 text-xs text-ink-muted">
                  {t('personal.habitSelectedDay')}: {viewDayKey}
                  {viewDayKey === todayKey ? ` (${t('personal.habitDateToday')})` : ''}
                  {viewDayKey === addDayKey(todayKey, -1) ? ` (${t('personal.habitDateYesterday')})` : ''}
                </p>
              ) : null}
            </section>
          </div>

          <HabitKpiGrid kpi={activeStats.kpi} unit={habit.targetUnit} />

          <section className="pf-card space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">{t('personal.habitDailyProgress')}</h2>
              <div className="flex flex-wrap gap-1">
                {CHART_PERIODS.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-medium',
                      chartPeriod === row.id ? 'bg-brand-600 text-white' : 'bg-surface-muted text-ink-muted',
                    )}
                    onClick={() => setChartPeriod(row.id)}
                  >
                    {t(`personal.habitChartPeriod.${row.id}`)}
                  </button>
                ))}
              </div>
            </div>
            {stats.isPending && !stats.data ? (
              <Skeleton className="h-36 w-full" />
            ) : periodConfig.daily ? (
              <HabitDailyProgressChart
                cells={activeStats.calendar}
                targetValue={habit.targetValue}
                unit={habit.targetUnit}
              />
            ) : (
              <HabitTrendBars points={activeStats.trend} targetValue={habit.targetValue} />
            )}
            <InsightLines kpi={activeStats.kpi} calendar={activeStats.calendar} />
          </section>

          <section className="pf-card p-4">
            <h2 className="pf-section-title">{t('personal.habitLogs')}</h2>
            {detail.data.logs.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">{t('personal.habitNoLogs')}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {detail.data.logs.map((log) => (
                  <li key={log.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink">
                      {log.dayKey} · {formatNum(log.value)}
                    </span>
                    <span className="text-xs text-ink-muted">{new Date(log.loggedAt).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {editOpen && habit ? (
        <HabitFormDialog
          habit={habit}
          stackOptions={(list.data?.items ?? []).map((item) => ({ id: item.id, title: item.title }))}
          pending={update.isPending}
          onClose={() => setEditOpen(false)}
          onSubmit={async (body) => {
            await update.mutateAsync({ id: habit.id, body });
          }}
        />
      ) : null}
    </div>
  );
}

function InsightLines({
  kpi,
  calendar,
}: {
  kpi: { completion: number; currentStreak: number; longestStreak: number; failed: number; completed: number };
  calendar: Array<{ dayKey: string; status: string; value: number }>;
}) {
  const { t } = useTranslation();
  const best = [...calendar]
    .filter((cell) => cell.value > 0)
    .sort((a, b) => b.value - a.value)[0];
  const broken = calendar.find((cell) => cell.status === 'FAILED');

  return (
    <ul className="space-y-1 text-xs text-ink-muted">
      <li>
        {t('personal.habitInsightCompletion', { rate: formatPct(kpi.completion), count: kpi.completed })}
      </li>
      {best ? (
        <li>{t('personal.habitInsightBestDay', { day: best.dayKey, value: formatNum(best.value) })}</li>
      ) : null}
      {broken ? <li>{t('personal.habitInsightBroken', { day: broken.dayKey })}</li> : null}
      {kpi.currentStreak > 0 && kpi.currentStreak === kpi.longestStreak ? (
        <li>{t('personal.habitInsightRecordStreak', { count: kpi.currentStreak })}</li>
      ) : null}
    </ul>
  );
}
