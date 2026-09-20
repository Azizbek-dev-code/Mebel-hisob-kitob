import { type CreateGrowthHabitRequest, type GrowthHabitDto } from '@furniture-erp/shared';
import { Check, Plus, Timer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import { HabitFormDialog } from '../components/HabitFormDialog';
import { formatPct, habitIcon, isDurationHabit, remainingHabitMinutes } from '../components/habit-ui';
import {
  useCheckInGrowthHabit,
  useCreateGrowthHabit,
  useGrowthHabits,
  useSkipGrowthHabit,
  useToggleHabitChecklist,
  useUpdateGrowthHabit,
} from '../hooks/use-growth-habits';

export function PersonalGrowthHabitsPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editHabit, setEditHabit] = useState<GrowthHabitDto | null>(null);

  const habits = useGrowthHabits();
  const create = useCreateGrowthHabit();
  const update = useUpdateGrowthHabit();
  const items = useMemo(() => habits.data?.items ?? [], [habits.data?.items]);

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-brand-700">
            <Link to={ROUTES.personalGrowth} className="hover:underline">
              {t('personal.navGrowth')}
            </Link>
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink">
            {t('personal.habitTitle')}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{t('personal.habitHint')}</p>
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

      {habits.isPending && !habits.data ? (
        <Skeleton className="h-40 w-full" />
      ) : habits.isError ? (
        <ErrorState
          title={t('personal.habitLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void habits.refetch()}
        />
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-muted">
          {t('personal.habitEmpty')}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              canWrite={canWrite}
              onEdit={() => setEditHabit(habit)}
            />
          ))}
        </ul>
      )}

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
  onEdit,
}: {
  habit: GrowthHabitDto;
  canWrite: boolean;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const checkIn = useCheckInGrowthHabit();
  const skip = useSkipGrowthHabit();
  const toggle = useToggleHabitChecklist();
  const Icon = habitIcon(habit.icon);
  const done = habit.todayStatus === 'COMPLETED';
  const partial = habit.todayStatus === 'PARTIAL';
  const duration = isDurationHabit(habit);
  const unitLabel = t(`personal.habitUnit.${habit.targetUnit}`, { defaultValue: habit.targetUnit });
  const timerTo = `${ROUTES.personalGrowthFocus}?habitId=${habit.id}&minutes=${remainingHabitMinutes(habit)}`;

  return (
    <li className="rounded-2xl border border-line bg-surface px-3 py-3">
      <div className="flex items-start gap-3">
        {duration ? (
          <Link
            to={done ? ROUTES.personalGrowthHabitDetail(habit.id) : timerTo}
            className={cn(
              'mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border',
              done
                ? 'border-brand-500 bg-brand-500 text-white'
                : partial
                  ? 'border-warning-500 bg-warning-50 text-warning-700'
                  : 'border-line-strong text-ink-muted',
            )}
            style={habit.color && done ? { background: habit.color, borderColor: habit.color } : undefined}
            aria-label={t('personal.habitStartTimer')}
          >
            {done ? <Check className="size-4" /> : <Timer className="size-4" />}
          </Link>
        ) : (
          <button
            type="button"
            disabled={!canWrite || checkIn.isPending || done}
            aria-label={t('personal.habitCheckIn')}
            className={cn(
              'mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border',
              done
                ? 'border-brand-500 bg-brand-500 text-white'
                : partial
                  ? 'border-warning-500 bg-warning-50 text-warning-700'
                  : 'border-line-strong text-transparent hover:border-brand-500 hover:text-brand-600',
            )}
            style={habit.color && done ? { background: habit.color, borderColor: habit.color } : undefined}
            onClick={() => void checkIn.mutateAsync({ id: habit.id })}
          >
            {done || partial ? <Check className="size-4" aria-hidden="true" /> : <Icon className="size-4 text-ink-muted" />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <Link to={ROUTES.personalGrowthHabitDetail(habit.id)} className="text-sm font-medium text-ink hover:underline">
            {habit.title}
          </Link>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t(`personal.habitSchedule.${habit.scheduleKind}`, {
              defaultValue: t(`personal.habitFrequency.${habit.frequency}`),
            })}
            {` · ${habit.targetValue} ${unitLabel}`}
            {habit.kind === 'BAD' ? ` · ${t('personal.habitKindBad')}` : ''}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {done
              ? t('personal.habitTodayDone')
              : partial
                ? formatPct(habit.todayProgress)
                : t('personal.habitTodayOpen')}
            {habit.currentStreak > 0
              ? ` · ${t('personal.habitStreak', { count: habit.currentStreak })}`
              : ''}
          </p>
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
                        body: { itemId: item.id, done: !item.doneToday },
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
          {habit.dueToday && !done ? (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-800">
              {t('personal.habitDue')}
            </span>
          ) : null}
          <button type="button" className="text-[11px] text-brand-700 hover:underline" onClick={onEdit}>
            {t('common.edit')}
          </button>
          {canWrite && habit.dueToday && !done ? (
            <button
              type="button"
              className="text-[11px] text-ink-muted hover:underline"
              onClick={() => void skip.mutateAsync({ id: habit.id })}
            >
              {t('personal.habitSkip')}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
