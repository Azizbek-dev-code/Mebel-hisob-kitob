import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import { HabitHeatmap, HabitKpiGrid, HabitTrendBars } from '../components/HabitCharts';
import { HabitFormDialog } from '../components/HabitFormDialog';
import { formatNum, formatPct, habitIcon, isDurationHabit, remainingHabitMinutes } from '../components/habit-ui';
import {
  useAddGrowthHabitLog,
  useGrowthHabitDetail,
  useGrowthHabits,
  useSkipGrowthHabit,
  useToggleHabitChecklist,
  useUpdateGrowthHabit,
} from '../hooks/use-growth-habits';

export function PersonalGrowthHabitDetailPage() {
  const { t } = useTranslation();
  const { habitId } = useParams<{ habitId: string }>();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);
  const detail = useGrowthHabitDetail(habitId);
  const list = useGrowthHabits();
  const update = useUpdateGrowthHabit();
  const addLog = useAddGrowthHabitLog();
  const skip = useSkipGrowthHabit();
  const toggle = useToggleHabitChecklist();
  const [editOpen, setEditOpen] = useState(false);
  const [logValue, setLogValue] = useState('');

  const habit = detail.data?.habit;
  const stats = detail.data?.statistics;
  const Icon = habitIcon(habit?.icon);

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
      ) : !habit || !stats ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-muted">
          {t('personal.habitEmpty')}
        </p>
      ) : (
        <>
          <section className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-start gap-3">
              <span
                className="flex size-12 items-center justify-center rounded-2xl text-white"
                style={{ background: habit.color || '#4f46e5' }}
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{habit.title}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {habit.kind === 'BAD' ? t('personal.habitKindBad') : t('personal.habitKindGood')}
                  {` · ${habit.targetValue} ${t(`personal.habitUnit.${habit.targetUnit}`, { defaultValue: habit.targetUnit })} / ${t(`personal.habitGoalPeriod.${habit.goalPeriod}`)}`}
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
            {canWrite && !habit.isArchived && isDurationHabit(habit) && habit.todayStatus !== 'COMPLETED' ? (
              <Link
                to={`${ROUTES.personalGrowthFocus}?habitId=${habit.id}&minutes=${remainingHabitMinutes(habit)}`}
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                {t('personal.habitStartTimer')}
              </Link>
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
              <div className="mt-3 flex flex-wrap gap-3">
                {habit.dueToday && habit.todayStatus !== 'COMPLETED' && habit.todayStatus !== 'SKIPPED' ? (
                  <button
                    type="button"
                    className="text-xs text-ink-muted hover:underline"
                    onClick={() => void skip.mutateAsync({ id: habit.id })}
                  >
                    {t('personal.habitSkip')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="text-xs text-ink-muted hover:underline"
                  onClick={() => void update.mutateAsync({ id: habit.id, body: { isArchived: true } })}
                >
                  {t('personal.habitArchive')}
                </button>
              </div>
            ) : null}
          </section>

          <HabitKpiGrid kpi={stats.kpi} unit={habit.targetUnit} />
          <p className="text-sm text-ink-muted">
            {t('personal.habitGoalProgress')}: {formatPct(stats.kpi.goalProgress)}
          </p>
          <section className="rounded-2xl border border-line bg-surface p-4">
            <HabitHeatmap cells={stats.calendar} />
          </section>
          <section className="rounded-2xl border border-line bg-surface p-4">
            <HabitTrendBars points={stats.trend} />
          </section>
          <section className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink">{t('personal.habitLogs')}</h2>
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
