import {
  addDayKey,
  GrowthHabitProgressPeriod,
  type CreateGrowthHabitRequest,
  type GrowthHabitDto,
} from '@furniture-erp/shared';
import { Check, ChevronLeft, ChevronRight, Flame, MoreHorizontal, Plus, Timer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { showPersonalToast } from '@/features/personal/feedback/personal-toast';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import { HabitFormDialog } from '../components/HabitFormDialog';
import { HabitMonthCalendar, HabitWeekStrip } from '../components/HabitMonthCalendar';
import { formatPct, habitIcon, isDurationHabit, remainingHabitMinutes } from '../components/habit-ui';
import {
  useCheckInGrowthHabit,
  useClearGrowthHabitDay,
  useCreateGrowthHabit,
  useGrowthHabits,
  useGrowthHabitsProgress,
  useSkipGrowthHabit,
  useToggleHabitChecklist,
  useUpdateGrowthHabit,
} from '../hooks/use-growth-habits';

function monthKeyOf(dayKey: string): string {
  return dayKey.slice(0, 7);
}

function formatSelectedDay(dayKey: string, todayKey: string, t: (key: string) => string): string {
  if (dayKey === todayKey) return t('personal.habitDateToday');
  if (dayKey === addDayKey(todayKey, -1)) return t('personal.habitDateYesterday');
  if (dayKey === addDayKey(todayKey, 1)) return t('personal.habitDateTomorrow');
  return dayKey;
}

function canWriteDay(dayKey: string, todayKey: string): boolean {
  return dayKey === todayKey || dayKey === addDayKey(todayKey, -1);
}

export function PersonalGrowthHabitsPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editHabit, setEditHabit] = useState<GrowthHabitDto | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [monthKey, setMonthKey] = useState<string | null>(null);

  // Load without dayKey first; only request a specific day when user navigates away from today.
  const habitsToday = useGrowthHabits();
  const todayKey = habitsToday.data?.todayKey ?? '';
  const viewDayKey = selectedDayKey ?? todayKey;
  const viewingOtherDay = Boolean(viewDayKey && todayKey && viewDayKey !== todayKey);
  const habitsOther = useGrowthHabits(false, viewingOtherDay ? viewDayKey : undefined);
  const habits = viewingOtherDay ? habitsOther : habitsToday;

  useEffect(() => {
    if (!todayKey) return;
    if (!monthKey) setMonthKey(monthKeyOf(todayKey));
  }, [todayKey, monthKey]);

  const calendarRange = useMemo(() => {
    const mk = monthKey ?? (todayKey ? monthKeyOf(todayKey) : null);
    if (!mk) return { period: GrowthHabitProgressPeriod.MONTH };
    const from = `${mk}-01`;
    const to = addDayKey(`${shiftMonth(mk, 1)}-01`, -1);
    return {
      period: GrowthHabitProgressPeriod.CUSTOM,
      from,
      to,
      includeArchived: true,
    };
  }, [monthKey, todayKey]);

  const progress = useGrowthHabitsProgress(calendarRange);
  const create = useCreateGrowthHabit();
  const update = useUpdateGrowthHabit();
  const items = useMemo(() => habits.data?.items ?? [], [habits.data?.items]);

  const dueCount = items.filter((item) => item.dueToday).length;
  const doneCount = items.filter((item) => item.todayStatus === 'COMPLETED').length;
  const dayProgress = dueCount > 0 ? doneCount / dueCount : items.length === 0 ? 0 : doneCount / items.length;

  useEffect(() => {
    if (searchParams.get('compose') !== '1') return;
    if (canWrite) setComposerOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('compose');
    setSearchParams(next, { replace: true });
  }, [canWrite, searchParams, setSearchParams]);

  function selectDay(dayKey: string) {
    setSelectedDayKey(dayKey);
    setMonthKey(monthKeyOf(dayKey));
  }

  const dateLabel = viewDayKey && todayKey ? formatSelectedDay(viewDayKey, todayKey, t) : t('personal.habitDateToday');
  const writable = canWrite && viewDayKey && todayKey ? canWriteDay(viewDayKey, todayKey) : false;

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-brand-700">
            <Link to={ROUTES.personalGrowth} className="hover:underline">
              {t('personal.navGrowth')}
            </Link>
          </p>
          <h1 className="pf-page-title mt-1">{t('personal.habitTitle')}</h1>
          <p className="pf-page-hint">{t('personal.habitHint')}</p>
        </div>
        <div className="flex max-w-[46%] shrink-0 flex-col items-stretch gap-2 sm:max-w-none sm:flex-row sm:items-end">
          <Link
            to={ROUTES.personalGrowthHabitsProgress}
            className="rounded-input border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-surface-hover"
          >
            {t('personal.habitProgressTitle')}
          </Link>
          <button
            type="button"
            disabled={!canWrite}
            onClick={() => setComposerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t('personal.habitAdd')}
          </button>
        </div>
      </div>

      <section className="pf-card space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              className="rounded-input border border-line p-1.5 text-ink hover:bg-surface-hover"
              onClick={() => viewDayKey && selectDay(addDayKey(viewDayKey, -1))}
              aria-label={t('personal.habitPrevDay')}
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="min-w-0 px-1 text-center">
              <p className="text-sm font-semibold text-ink">{dateLabel}</p>
              {viewDayKey && dateLabel !== viewDayKey ? (
                <p className="text-[11px] tabular-nums text-ink-muted">{viewDayKey}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-input border border-line p-1.5 text-ink hover:bg-surface-hover"
              onClick={() => viewDayKey && selectDay(addDayKey(viewDayKey, 1))}
              aria-label={t('personal.habitNextDay')}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-ink"
              onClick={() => todayKey && selectDay(addDayKey(todayKey, -1))}
            >
              {t('personal.habitDateYesterday')}
            </button>
            <button
              type="button"
              className="rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white"
              onClick={() => todayKey && selectDay(todayKey)}
            >
              {t('personal.habitDateToday')}
            </button>
            <button
              type="button"
              className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-ink"
              onClick={() => todayKey && selectDay(addDayKey(todayKey, 1))}
            >
              {t('personal.habitDateTomorrow')}
            </button>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
            <span>{t('personal.habitDailyOverview')}</span>
            <span className="tabular-nums">
              {doneCount}/{Math.max(dueCount, items.length)} · {formatPct(dayProgress)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${Math.min(100, Math.round(dayProgress * 100))}%` }}
            />
          </div>
        </div>

        {todayKey ? (
          <HabitWeekStrip
            cells={progress.data?.calendar ?? []}
            todayKey={todayKey}
            selectedDayKey={viewDayKey}
            onSelectDay={selectDay}
          />
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="pf-card p-3 sm:p-4">
          {progress.isPending && !progress.data ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <HabitMonthCalendar
              cells={progress.data?.calendar ?? []}
              selectedDayKey={viewDayKey}
              todayKey={todayKey || viewDayKey}
              monthKey={monthKey ?? monthKeyOf(viewDayKey || todayKey || '2026-01')}
              onMonthChange={setMonthKey}
              onSelectDay={selectDay}
            />
          )}
          {(habits.data?.bestCurrentStreak ?? 0) > 0 ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
              <Flame className="size-3.5 text-brand-600" aria-hidden="true" />
              {t('personal.habitBestActiveStreak', { count: habits.data?.bestCurrentStreak ?? 0 })}
            </p>
          ) : null}
        </section>

        <section className="min-w-0 space-y-2">
          {habits.isPending && !habits.data ? (
            <Skeleton className="h-40 w-full" />
          ) : habits.isError ? (
            <ErrorState
              title={t('personal.habitLoadFailed')}
              message={t('common.retry')}
              onRetry={() => void habits.refetch()}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Flame}
              title={t('personal.habitEmpty')}
              description={t('personal.habitHint')}
              action={
                canWrite ? (
                  <button type="button" className="pf-btn-primary" onClick={() => setComposerOpen(true)}>
                    {t('personal.habitAdd')}
                  </button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-2">
              {items.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  canWrite={writable}
                  viewDayKey={viewDayKey}
                  onEdit={() => setEditHabit(habit)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {composerOpen ? (
        <HabitFormDialog
          stackOptions={items.map((item) => ({ id: item.id, title: item.title }))}
          pending={create.isPending}
          onClose={() => setComposerOpen(false)}
          onSubmit={async (body) => {
            await create.mutateAsync(body as CreateGrowthHabitRequest);
          }}
        />
      ) : null}
      {editHabit ? (
        <HabitFormDialog
          habit={editHabit}
          stackOptions={items.map((item) => ({ id: item.id, title: item.title }))}
          pending={update.isPending}
          onClose={() => setEditHabit(null)}
          onSubmit={async (body) => {
            await update.mutateAsync({ id: editHabit.id, body });
          }}
        />
      ) : null}
    </div>
  );
}

function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(y!, (m ?? 1) - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function HabitRow({
  habit,
  canWrite,
  viewDayKey,
  onEdit,
}: {
  habit: GrowthHabitDto;
  canWrite: boolean;
  viewDayKey: string;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const checkIn = useCheckInGrowthHabit();
  const clearDay = useClearGrowthHabitDay();
  const skip = useSkipGrowthHabit();
  const toggle = useToggleHabitChecklist();
  const Icon = habitIcon(habit.icon);
  const done = habit.todayStatus === 'COMPLETED';
  const partial = habit.todayStatus === 'PARTIAL';
  const skipped = habit.todayStatus === 'SKIPPED';
  const failed = habit.todayStatus === 'FAILED';
  const duration = isDurationHabit(habit);
  const unitLabel = t(`personal.habitUnit.${habit.targetUnit}`, { defaultValue: habit.targetUnit });
  const timerTo = `${ROUTES.personalGrowthFocus}?habitId=${habit.id}&minutes=${remainingHabitMinutes(habit)}`;
  const busy = checkIn.isPending || clearDay.isPending;

  async function toggleComplete() {
    if (done || skipped) {
      await clearDay.mutateAsync({ id: habit.id, body: { dayKey: viewDayKey } });
      return;
    }
    await checkIn.mutateAsync({ id: habit.id, body: { dayKey: viewDayKey } });
    showPersonalToast({
      message: t('personal.toastHabitStreak'),
      tone: 'streak',
    });
  }

  return (
    <li className="pf-card px-3 py-3">
      <div className="flex items-start gap-3">
        {duration && !done ? (
          <Link
            to={timerTo}
            className={cn(
              'pf-check mt-0.5',
              partial && 'border-warning-500 bg-warning-50 text-warning-700',
            )}
            style={habit.color ? { borderColor: habit.color } : undefined}
            aria-label={t('personal.habitStartTimer')}
          >
            <Timer className="size-4" />
          </Link>
        ) : (
          <button
            type="button"
            disabled={!canWrite || busy}
            aria-label={done || skipped ? t('personal.habitUncomplete') : t('personal.habitCheckIn')}
            className={cn(
              'pf-check mt-0.5',
              done && 'pf-check--done',
              partial && !done && 'border-warning-500 bg-warning-50 text-warning-700',
              failed && !done && 'border-danger-300 bg-danger-50 text-danger-700',
              skipped && 'border-slate-300 bg-slate-100 text-ink-muted',
            )}
            style={habit.color && done ? { background: habit.color, borderColor: habit.color } : undefined}
            onClick={() => void toggleComplete()}
          >
            {done || partial ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <Icon className="size-4 text-ink-muted" style={habit.color ? { color: habit.color } : undefined} />
            )}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: habit.color || '#064e3b' }}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <Link
                to={ROUTES.personalGrowthHabitDetail(habit.id)}
                className="text-sm font-medium text-ink hover:underline"
              >
                {habit.title}
              </Link>
              <p className="mt-0.5 text-xs text-ink-muted">
                {done
                  ? t('personal.habitTodayDone')
                  : partial
                    ? formatPct(habit.todayProgress)
                    : skipped
                      ? t('personal.habitSkipped')
                      : failed
                        ? t('personal.habitMissed')
                        : t('personal.habitTodayOpen')}
                {habit.currentStreak > 0
                  ? ` · ${t('personal.habitStreak', { count: habit.currentStreak })}`
                  : ''}
                {` · ${habit.targetValue} ${unitLabel}`}
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={cn('h-full rounded-full', done ? 'bg-brand-500' : 'bg-brand-300')}
                  style={{
                    width: `${Math.min(100, Math.round(habit.todayProgress * 100))}%`,
                    background: habit.color && done ? habit.color : undefined,
                  }}
                />
              </div>
            </div>
          </div>
          {habit.checklist.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {habit.checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    disabled={!canWrite}
                    className={cn(
                      'size-4 rounded border',
                      item.doneToday ? 'border-brand-500 bg-brand-500' : 'border-line-strong',
                    )}
                    onClick={() =>
                      void toggle.mutateAsync({
                        id: habit.id,
                        body: { itemId: item.id, done: !item.doneToday, dayKey: viewDayKey },
                      })
                    }
                    aria-label={item.title}
                  />
                  <span className={item.doneToday ? 'text-ink-muted line-through' : 'text-ink'}>{item.title}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {habit.dueToday && !done && !skipped ? (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-800">
              {t('personal.habitDue')}
            </span>
          ) : null}
          <button
            type="button"
            className="rounded-input p-1 text-ink-muted hover:bg-surface-hover hover:text-ink"
            onClick={onEdit}
            aria-label={t('common.edit')}
          >
            <MoreHorizontal className="size-4" />
          </button>
          {canWrite && habit.dueToday && !done && !skipped ? (
            <button
              type="button"
              className="text-[11px] text-ink-muted hover:underline"
              onClick={() => void skip.mutateAsync({ id: habit.id, body: { dayKey: viewDayKey } })}
            >
              {t('personal.habitSkip')}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
