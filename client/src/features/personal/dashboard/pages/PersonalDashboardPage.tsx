import { formatMoney, formatFocusMinutes, GrowthTodoStatus, type GrowthTodoDto } from '@furniture-erp/shared';
import { CalendarDays, Check, Flame, Sparkles, Target, Timer, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import { useGrowthFocusStats } from '../../growth/hooks/use-growth-focus';
import { useTodayGrowthProgress } from '../../growth/hooks/use-growth-habits';
import { useGrowthProgress } from '../../growth/hooks/use-growth-xp';
import {
  useTodayGrowthTodos,
  useUpdateGrowthTodo,
} from '../../growth/hooks/use-growth-todos';
import { usePersonalSummary } from '../../ledger/hooks/use-personal-ledger';
import { usePersonalPlanDay } from '../../plan/hooks/use-personal-plan';

function utcTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/**
 * Command center: answer “Bugun nima qilishim kerak?” in a few seconds.
 * Growth slots are placeholders until later phases; plan + finance are live.
 */
export function PersonalDashboardPage() {
  const { t } = useTranslation();
  const summary = usePersonalSummary();
  const todayKey = utcTodayKey();
  const dayPlan = usePersonalPlanDay(todayKey);
  const todayTodos = useTodayGrowthTodos();
  const updateTodo = useUpdateGrowthTodo();
  const focusStats = useGrowthFocusStats();
  const todayProgress = useTodayGrowthProgress();
  const growthProgress = useGrowthProgress();
  const [selectedTodo, setSelectedTodo] = useState<GrowthTodoDto | null>(null);

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.homeTitle')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.homeHint')}</p>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Target className="size-4 text-brand-700" aria-hidden="true" />
            {t('personal.homeTodayTasks')}
          </h2>
          <Link
            to={ROUTES.personalGrowthTodos}
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            {t('personal.allTasks')}
          </Link>
        </div>
        {todayTodos.isPending && !todayTodos.data ? (
          <Skeleton className="mt-3 h-16 w-full" />
        ) : (todayTodos.data?.focus.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">{t('personal.homeTodayTasksEmpty')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {todayTodos.data?.focus.slice(0, 3).map((todo) => (
              <li key={todo.id} className="flex items-center gap-2.5 text-sm">
                <button
                  type="button"
                  disabled={updateTodo.isPending || todo.status === GrowthTodoStatus.DONE}
                  aria-label={t('personal.todoMarkDone')}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line-strong hover:border-brand-500 hover:text-brand-600"
                  onClick={() =>
                    void updateTodo.mutateAsync({
                      id: todo.id,
                      body: { status: GrowthTodoStatus.DONE },
                    })
                  }
                >
                  <Check className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTodo(todo)}
                  className="min-w-0 flex-1 truncate text-left text-ink hover:underline"
                >
                  {todo.title}
                </button>
                {todo.estimatedMinutes ? (
                  <span className="shrink-0 tabular-nums text-xs text-ink-muted">
                    {todo.estimatedMinutes} {t('personal.plan.minutes')}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <CalendarDays className="size-4 text-brand-700" aria-hidden="true" />
            {t('personal.homeTodayPlan')}
          </h2>
          <Link to={ROUTES.personalPlan} className="text-xs font-medium text-brand-700 hover:underline">
            {t('personal.navPlan')}
          </Link>
        </div>
        {dayPlan.isPending && !dayPlan.data ? (
          <Skeleton className="mt-3 h-16 w-full" />
        ) : (dayPlan.data?.items.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">{t('personal.homeTodayPlanEmpty')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {dayPlan.data?.items.slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-ink">{item.title}</span>
                <span className="shrink-0 tabular-nums text-ink-muted">
                  {item.allDay ? t('personal.plan.allDay') : formatClock(item.startsAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-3 gap-2.5">
        <Link to={ROUTES.personalGrowthLevel} className="block">
          <StatChip
            icon={Flame}
            label={t('personal.homeStreak')}
            value={
              growthProgress.data && growthProgress.data.currentStreak > 0
                ? String(growthProgress.data.currentStreak)
                : t('personal.homeStatSoon')
            }
          />
        </Link>
        <Link to={ROUTES.personalGrowthLevel} className="block">
          <StatChip
            icon={Sparkles}
            label={t('personal.homeLevel')}
            value={
              growthProgress.data ? String(growthProgress.data.level) : t('personal.homeStatSoon')
            }
          />
        </Link>
        <Link to={ROUTES.personalGrowthFocus} className="block">
          <StatChip
            icon={Timer}
            label={t('personal.homeFocus')}
            value={
              focusStats.data
                ? formatFocusMinutes(focusStats.data.stats.todayMinutes)
                : t('personal.homeStatSoon')
            }
          />
        </Link>
      </div>

      {summary.isPending && !summary.data ? (
        <Skeleton className="h-28 w-full" />
      ) : summary.isError ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void summary.refetch()}
        />
      ) : (
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">{t('personal.homeTodayFinance')}</h2>
            <Link
              to={ROUTES.personalFinance}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              {t('personal.navFinance')}
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-ink-muted">{t('personal.monthIncome')}</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums pf-amount-income">
                {formatMoney(summary.data?.monthIncomeSom ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">{t('personal.monthExpense')}</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums pf-amount-expense">
                {formatMoney(summary.data?.monthExpenseSom ?? 0)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            {t('personal.totalBalance')}:{' '}
            <span
              className={
                (summary.data?.totalBalanceSom ?? 0) < 0
                  ? 'font-medium tabular-nums pf-amount-negative'
                  : 'font-medium tabular-nums text-ink'
              }
            >
              {formatMoney(summary.data?.totalBalanceSom ?? 0)}
            </span>
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            {t('personal.homeFinanceXpHint')}{' '}
            <Link to={ROUTES.personalGrowthLevel} className="font-medium text-brand-700 hover:underline">
              {t('personal.growth.level')}
            </Link>
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Trophy className="size-4 text-brand-700" aria-hidden="true" />
            {t('personal.rankingTitle')}
          </h2>
          <Link to={ROUTES.personalRanking} className="text-xs font-medium text-brand-700 hover:underline">
            {t('personal.rankingOpen')}
          </Link>
        </div>
        <p className="mt-2 text-sm text-ink-muted">{t('personal.rankingHint')}</p>
        <Link
          to={ROUTES.personalGrowthFriends}
          className="mt-3 inline-block text-xs font-medium text-brand-700 hover:underline"
        >
          {t('personal.friendsTitle')}
        </Link>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">{t('personal.homeTodayProgress')}</h2>
          <Link
            to={ROUTES.personalGrowthHabits}
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            {t('personal.growth.habits')}
          </Link>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width]"
            style={{ width: `${todayProgress.data?.percent ?? 0}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          {todayProgress.data &&
          todayProgress.data.habitsDue +
            todayProgress.data.dailyGoalsTotal +
            todayProgress.data.focusTodosTotal >
            0
            ? t('personal.homeTodayProgressValue', { percent: todayProgress.data.percent })
            : t('personal.homeTodayProgressEmpty')}
        </p>
      </section>

      <Dialog
        open={Boolean(selectedTodo)}
        title={selectedTodo?.title ?? t('personal.growth.todo')}
        onClose={() => setSelectedTodo(null)}
      >
        {selectedTodo ? (
          <div className="space-y-3 text-sm">
            {selectedTodo.description ? <p className="text-ink-muted">{selectedTodo.description}</p> : null}
            <p className="text-ink-muted">
              {t('personal.todoPriority')}: {selectedTodo.priority}
            </p>
            {selectedTodo.dueAt ? (
              <p className="text-ink-muted">
                {t('personal.todoDue')}: {formatClock(selectedTodo.dueAt)}
              </p>
            ) : null}
            {selectedTodo.estimatedMinutes ? (
              <p className="text-ink-muted">
                {selectedTodo.estimatedMinutes} {t('personal.plan.minutes')}
              </p>
            ) : null}
            <button
              type="button"
              disabled={updateTodo.isPending || selectedTodo.status === GrowthTodoStatus.DONE}
              className="w-full rounded-input bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
              onClick={() => {
                void updateTodo.mutateAsync({
                  id: selectedTodo.id,
                  body: { status: GrowthTodoStatus.DONE },
                });
                setSelectedTodo(null);
              }}
            >
              {t('personal.todoMarkDone')}
            </button>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-line bg-surface px-2.5 py-3 text-center')}>
      <Icon className="mx-auto size-4 text-brand-700" aria-hidden="true" />
      <p className="mt-1.5 text-[10px] leading-tight text-ink-muted">{label}</p>
      <p className="mt-0.5 text-xs font-semibold text-ink">{value}</p>
    </div>
  );
}
