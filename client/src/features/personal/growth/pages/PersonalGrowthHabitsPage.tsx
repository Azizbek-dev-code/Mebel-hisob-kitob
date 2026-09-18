import {
  GrowthHabitFrequency,
  type CreateGrowthHabitRequest,
  type GrowthDailyGoalDto,
  type GrowthHabitDto,
} from '@furniture-erp/shared';
import { Check, Flame, Plus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import {
  useCheckInGrowthHabit,
  useCreateGrowthHabit,
  useGrowthDailyGoals,
  useGrowthHabits,
  useUpdateGrowthDailyGoal,
  useUpsertGrowthDailyGoals,
} from '../hooks/use-growth-habits';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export function PersonalGrowthHabitsPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);
  const [composerOpen, setComposerOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const habits = useGrowthHabits();
  const daily = useGrowthDailyGoals();
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
        <button
          type="button"
          disabled={!canWrite}
          onClick={() => setComposerOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t('personal.habitAdd')}
        </button>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-ink">{t('personal.dailyGoalsTitle')}</h2>
            <p className="mt-0.5 text-xs text-ink-muted">{t('personal.dailyGoalsHint')}</p>
          </div>
          <button
            type="button"
            disabled={!canWrite}
            onClick={() => setGoalsOpen(true)}
            className="text-xs font-medium text-brand-700 hover:underline disabled:opacity-60"
          >
            {t('personal.dailyGoalsEdit')}
          </button>
        </div>
        {daily.isPending && !daily.data ? (
          <Skeleton className="mt-3 h-16 w-full" />
        ) : (daily.data?.items.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">{t('personal.dailyGoalsEmpty')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {daily.data?.items.map((goal) => (
              <DailyGoalRow key={goal.id} goal={goal} canWrite={canWrite} />
            ))}
          </ul>
        )}
        {daily.data && daily.data.totalCount > 0 ? (
          <p className="mt-3 text-xs font-medium text-ink-soft">
            {t('personal.dailyGoalsProgress', {
              done: daily.data.doneCount,
              total: daily.data.totalCount,
            })}
          </p>
        ) : null}
      </section>

      {habits.data ? (
        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <Flame className="size-3.5 text-brand-700" aria-hidden="true" />
          {t('personal.habitStats', {
            due: habits.data.dueTodayCount,
            streak: habits.data.bestCurrentStreak,
          })}
        </p>
      ) : null}

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
            <HabitRow key={habit.id} habit={habit} canWrite={canWrite} />
          ))}
        </ul>
      )}

      {composerOpen ? <HabitComposer onClose={() => setComposerOpen(false)} /> : null}
      {goalsOpen ? (
        <DailyGoalsEditor
          initial={daily.data?.items ?? []}
          onClose={() => setGoalsOpen(false)}
        />
      ) : null}
    </div>
  );
}

function HabitRow({ habit, canWrite }: { habit: GrowthHabitDto; canWrite: boolean }) {
  const { t } = useTranslation();
  const checkIn = useCheckInGrowthHabit();
  const done = Boolean(
    habit.todayCheckIn && habit.todayCheckIn.value + 1e-9 >= habit.targetValue,
  );

  return (
    <li className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-3 py-3">
      <button
        type="button"
        disabled={!canWrite || checkIn.isPending || done}
        aria-label={t('personal.habitCheckIn')}
        className={cn(
          'mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border',
          done
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-line-strong text-transparent hover:border-brand-500 hover:text-brand-600',
        )}
        onClick={() => void checkIn.mutateAsync({ id: habit.id })}
      >
        <Check className="size-4" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium text-ink', done && 'text-ink-muted')}>{habit.title}</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          {t(`personal.habitFrequency.${habit.frequency}`)}
          {` · ${habit.targetValue} ${habit.targetUnit}`}
          {habit.category ? ` · ${habit.category}` : ''}
          {habit.currentStreak > 0
            ? ` · ${t('personal.habitStreak', { count: habit.currentStreak })}`
            : ''}
        </p>
      </div>
      {habit.dueToday && !done ? (
        <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-800">
          {t('personal.habitDue')}
        </span>
      ) : null}
    </li>
  );
}

function DailyGoalRow({ goal, canWrite }: { goal: GrowthDailyGoalDto; canWrite: boolean }) {
  const { t } = useTranslation();
  const update = useUpdateGrowthDailyGoal();

  return (
    <li className="flex items-center gap-2.5 text-sm">
      <button
        type="button"
        disabled={!canWrite || update.isPending || goal.isDone}
        aria-label={t('personal.dailyGoalsMarkDone')}
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full border',
          goal.isDone
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-line-strong text-transparent hover:border-brand-500 hover:text-brand-600',
        )}
        onClick={() => void update.mutateAsync({ id: goal.id, body: { isDone: true } })}
      >
        <Check className="size-3" aria-hidden="true" />
      </button>
      <span className={cn('min-w-0 truncate', goal.isDone && 'text-ink-muted line-through')}>
        {goal.title}
      </span>
      {goal.estimatedMinutes ? (
        <span className="ml-auto shrink-0 text-xs text-ink-muted">{goal.estimatedMinutes}m</span>
      ) : null}
    </li>
  );
}

function HabitComposer({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateGrowthHabit();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState<string>(GrowthHabitFrequency.DAILY);
  const [targetValue, setTargetValue] = useState('1');
  const [targetUnit, setTargetUnit] = useState('times');
  const [intervalDays, setIntervalDays] = useState('2');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const body: CreateGrowthHabitRequest = {
      title: title.trim(),
      category: category.trim() || null,
      frequency: frequency as CreateGrowthHabitRequest['frequency'],
      targetValue: Number(targetValue) || 1,
      targetUnit: targetUnit.trim() || 'times',
      intervalDays:
        frequency === GrowthHabitFrequency.CUSTOM ? Number(intervalDays) || null : null,
    };
    try {
      await create.mutateAsync(body);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('personal.habitSaveFailed'));
    }
  }

  return (
    <Dialog open onClose={onClose} title={t('personal.habitAdd')} className="sm:max-w-md">
      <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.habitFieldTitle')}</span>
          <input
            className={fieldClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('personal.habitTitlePlaceholder')}
            required
            maxLength={200}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.habitFieldFrequency')}</span>
            <select
              className={fieldClass}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              {Object.values(GrowthHabitFrequency).map((value) => (
                <option key={value} value={value}>
                  {t(`personal.habitFrequency.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.plan.fieldCategory')}</span>
            <input
              className={fieldClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
        </div>
        {frequency === GrowthHabitFrequency.CUSTOM ? (
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.habitFieldInterval')}</span>
            <input
              type="number"
              min={1}
              max={365}
              className={fieldClass}
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
            />
          </label>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.habitFieldTarget')}</span>
            <input
              type="number"
              min={0.1}
              step="any"
              className={fieldClass}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.habitFieldUnit')}</span>
            <input
              className={fieldClass}
              value={targetUnit}
              onChange={(e) => setTargetUnit(e.target.value)}
              placeholder="minutes"
            />
          </label>
        </div>
        {error ? (
          <p className="text-sm text-danger-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-input border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface-hover"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={create.isPending || !title.trim()}
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {create.isPending ? t('app.loading') : t('common.save')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function DailyGoalsEditor({
  initial,
  onClose,
}: {
  initial: GrowthDailyGoalDto[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const upsert = useUpsertGrowthDailyGoals();
  const [rows, setRows] = useState<
    Array<{ id?: string; title: string; estimatedMinutes: string; isDone: boolean }>
  >(() =>
    initial.length > 0
      ? initial.map((g) => ({
          id: g.id,
          title: g.title,
          estimatedMinutes: g.estimatedMinutes ? String(g.estimatedMinutes) : '',
          isDone: g.isDone,
        }))
      : [{ title: '', estimatedMinutes: '', isDone: false }],
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const items = rows
      .map((row) => ({
        id: row.id,
        title: row.title.trim(),
        estimatedMinutes: row.estimatedMinutes ? Number(row.estimatedMinutes) : null,
        isDone: row.isDone,
      }))
      .filter((row) => row.title.length > 0);
    try {
      await upsert.mutateAsync({ items });
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('personal.dailyGoalsSaveFailed'));
    }
  }

  return (
    <Dialog open onClose={onClose} title={t('personal.dailyGoalsEdit')} className="sm:max-w-md">
      <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_72px] gap-2">
            <input
              className={fieldClass}
              value={row.title}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r, i) => (i === index ? { ...r, title: e.target.value } : r)),
                )
              }
              placeholder={t('personal.dailyGoalsPlaceholder')}
              maxLength={200}
            />
            <input
              type="number"
              min={1}
              max={1440}
              className={fieldClass}
              value={row.estimatedMinutes}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r, i) =>
                    i === index ? { ...r, estimatedMinutes: e.target.value } : r,
                  ),
                )
              }
              placeholder="min"
            />
          </div>
        ))}
        {rows.length < 3 ? (
          <button
            type="button"
            className="text-xs font-medium text-brand-700 hover:underline"
            onClick={() =>
              setRows((prev) => [...prev, { title: '', estimatedMinutes: '', isDone: false }])
            }
          >
            {t('personal.dailyGoalsAddRow')}
          </button>
        ) : null}
        {error ? (
          <p className="text-sm text-danger-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-input border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface-hover"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={upsert.isPending}
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {upsert.isPending ? t('app.loading') : t('common.save')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
