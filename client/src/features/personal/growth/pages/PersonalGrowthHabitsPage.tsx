import {
  addDayKey,
  GrowthHabitProgressPeriod,
  type CreateGrowthHabitRequest,
  type GrowthHabitDto,
} from '@furniture-erp/shared';
import { Check, Flame, MoreHorizontal, Plus, Timer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { showPersonalToast } from '@/features/personal/feedback/personal-toast';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import { HabitActionSheet, type HabitMenuAction } from '../components/HabitActionSheet';
import { HabitDateSelector } from '../components/HabitDateSelector';
import { HabitFormDialog } from '../components/HabitFormDialog';
import { HabitLogDialog, HabitNoteDialog, HabitNotesListDialog } from '../components/HabitQuickDialogs';
import {
  formatHabitTargetProgress,
  habitIcon,
  monthKeyOf,
  remainingHabitMinutes,
} from '../components/habit-ui';
import {
  useAddGrowthHabitLog,
  useCheckInGrowthHabit,
  useClearGrowthHabitDay,
  useCreateGrowthHabit,
  useFailGrowthHabit,
  useGrowthHabitLogs,
  useGrowthHabits,
  useGrowthHabitsProgress,
  useSkipGrowthHabit,
  useUpdateGrowthHabit,
} from '../hooks/use-growth-habits';

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

  const habitsToday = useGrowthHabits();
  const todayKey = habitsToday.data?.todayKey ?? '';
  const viewDayKey = selectedDayKey ?? todayKey;
  const viewingOtherDay = Boolean(viewDayKey && todayKey && viewDayKey !== todayKey);
  const habitsOther = useGrowthHabits(false, viewingOtherDay ? viewDayKey : undefined);
  const habits = viewingOtherDay ? habitsOther : habitsToday;

  const monthKey = viewDayKey ? monthKeyOf(viewDayKey) : todayKey ? monthKeyOf(todayKey) : null;
  const progress = useGrowthHabitsProgress(
    useMemo(() => {
      if (!monthKey) return { period: GrowthHabitProgressPeriod.MONTH };
      const [y, m] = monthKey.split('-').map(Number);
      const next = new Date(Date.UTC(y!, m ?? 1, 1));
      const to = addDayKey(
        `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`,
        -1,
      );
      return {
        period: GrowthHabitProgressPeriod.CUSTOM,
        from: `${monthKey}-01`,
        to,
        includeArchived: true,
      };
    }, [monthKey]),
  );

  const create = useCreateGrowthHabit();
  const update = useUpdateGrowthHabit();
  const items = useMemo(
    () => (habits.data?.items ?? []).filter((habit) => habit.scheduled),
    [habits.data?.items],
  );
  const writable = Boolean(canWrite && viewDayKey && todayKey && canWriteDay(viewDayKey, todayKey));

  useEffect(() => {
    if (searchParams.get('compose') !== '1') return;
    if (canWrite) setComposerOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('compose');
    setSearchParams(next, { replace: true });
  }, [canWrite, searchParams, setSearchParams]);

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-brand-700">
            <Link to={ROUTES.personalGrowth} className="hover:underline">
              {t('personal.navGrowth')}
            </Link>
          </p>
          <h1 className="pf-page-title mt-1">{t('personal.habitTitle')}</h1>
        </div>
        <button
          type="button"
          disabled={!canWrite}
          onClick={() => setComposerOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('personal.habitAdd')}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {todayKey ? (
          <HabitDateSelector
            todayKey={todayKey}
            selectedDayKey={viewDayKey}
            onSelect={setSelectedDayKey}
            cells={progress.data?.calendar ?? []}
          />
        ) : (
          <Skeleton className="h-10 w-28" />
        )}
        <Link
          to={ROUTES.personalGrowthHabitsProgress}
          className="text-xs font-medium text-brand-700 hover:underline"
        >
          {t('personal.habitProgressTitle')}
        </Link>
      </div>

      <section className="min-w-0">
        <h2 className="mb-2 text-sm font-semibold text-ink">{t('personal.habitTodayList')}</h2>
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
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
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
  const navigate = useNavigate();
  const checkIn = useCheckInGrowthHabit();
  const clearDay = useClearGrowthHabitDay();
  const skip = useSkipGrowthHabit();
  const fail = useFailGrowthHabit();
  const addLog = useAddGrowthHabitLog();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const notesQuery = useGrowthHabitLogs(
    habit.id,
    { from: addDayKey(viewDayKey, -90), to: viewDayKey },
    notesOpen,
  );

  const Icon = habitIcon(habit.icon);
  const done = habit.todayStatus === 'COMPLETED';
  const skipped = habit.todayStatus === 'SKIPPED';
  const failed = habit.todayStatus === 'FAILED';
  const partial = habit.todayStatus === 'PARTIAL';
  const busy = checkIn.isPending || clearDay.isPending;
  const timerTo = `${ROUTES.personalGrowthFocus}?habitId=${habit.id}&minutes=${remainingHabitMinutes(habit)}`;
  const progressPct = Math.min(100, Math.round(habit.todayProgress * 100));

  async function toggleComplete() {
    if (done || skipped || failed) {
      await clearDay.mutateAsync({ id: habit.id, body: { dayKey: viewDayKey } });
      return;
    }
    await checkIn.mutateAsync({ id: habit.id, body: { dayKey: viewDayKey } });
    showPersonalToast({ message: t('personal.toastHabitStreak'), tone: 'streak' });
  }

  async function onMenuAction(action: HabitMenuAction) {
    switch (action) {
      case 'complete':
        await toggleComplete();
        break;
      case 'uncomplete':
        await clearDay.mutateAsync({ id: habit.id, body: { dayKey: viewDayKey } });
        break;
      case 'skip':
        await skip.mutateAsync({ id: habit.id, body: { dayKey: viewDayKey } });
        break;
      case 'fail':
        await fail.mutateAsync({ id: habit.id, body: { dayKey: viewDayKey } });
        break;
      case 'log':
        setLogOpen(true);
        break;
      case 'timer':
        navigate(timerTo);
        break;
      case 'note':
        setNoteOpen(true);
        break;
      case 'notes':
        setNotesOpen(true);
        break;
      case 'edit':
        onEdit();
        break;
      default:
        break;
    }
  }

  const noteRows = (notesQuery.data?.items ?? [])
    .filter((row) => Boolean(row.note?.trim()))
    .map((row) => ({
      id: row.id,
      dayKey: row.dayKey,
      note: row.note!.trim(),
      loggedAt: row.loggedAt,
    }));

  return (
    <li className="px-3 py-3">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          disabled={!canWrite || busy}
          aria-label={done || skipped || failed ? t('personal.habitUncomplete') : t('personal.habitCheckIn')}
          className={cn(
            'pf-check shrink-0',
            done && 'pf-check--done',
            partial && !done && 'border-warning-500 bg-warning-50 text-warning-700',
            failed && 'border-danger-300 bg-danger-50 text-danger-700',
            skipped && 'border-slate-300 bg-slate-100 text-ink-muted',
          )}
          style={habit.color && done ? { background: habit.color, borderColor: habit.color } : undefined}
          onClick={() => void toggleComplete()}
        >
          {done || partial ? <Check className="size-4" aria-hidden="true" /> : null}
        </button>

        <Link
          to={ROUTES.personalGrowthHabitDetail(habit.id)}
          className="min-w-0 flex-1"
        >
          <div className="flex items-center gap-2">
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: habit.color || '#064e3b' }}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{habit.title}</p>
              <p className="mt-0.5 text-xs tabular-nums text-ink-muted">
                {formatHabitTargetProgress(habit, t)}
                {habit.currentStreak > 0 ? ` · ${t('personal.habitStreak', { count: habit.currentStreak })}` : ''}
              </p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{
                    width: `${progressPct}%`,
                    background: habit.color && progressPct > 0 ? habit.color : undefined,
                  }}
                />
              </div>
            </div>
          </div>
        </Link>

        <Link
          to={timerTo}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-input text-brand-700 hover:bg-brand-50"
          aria-label={t('personal.habitStartTimer')}
        >
          <Timer className="size-5" />
        </Link>
        <button
          type="button"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-input text-ink-muted hover:bg-surface-hover hover:text-ink"
          aria-label={t('personal.habitMore')}
          onClick={() => setMenuOpen(true)}
        >
          <MoreHorizontal className="size-5" />
        </button>
      </div>

      <HabitActionSheet
        habit={habit}
        open={menuOpen}
        canWrite={canWrite}
        onClose={() => setMenuOpen(false)}
        onAction={(action) => void onMenuAction(action)}
      />
      {logOpen ? (
        <HabitLogDialog
          habit={habit}
          pending={addLog.isPending}
          onClose={() => setLogOpen(false)}
          onSubmit={async (value) => {
            await addLog.mutateAsync({ id: habit.id, body: { value, dayKey: viewDayKey } });
          }}
        />
      ) : null}
      {noteOpen ? (
        <HabitNoteDialog
          habit={habit}
          pending={addLog.isPending}
          onClose={() => setNoteOpen(false)}
          onSubmit={async (note) => {
            await addLog.mutateAsync({ id: habit.id, body: { value: 0, note, dayKey: viewDayKey } });
          }}
        />
      ) : null}
      {notesOpen ? (
        <HabitNotesListDialog
          habit={habit}
          notes={noteRows}
          loading={notesQuery.isPending}
          onClose={() => setNotesOpen(false)}
        />
      ) : null}
    </li>
  );
}
