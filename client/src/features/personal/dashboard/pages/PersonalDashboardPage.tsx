import {
  formatMoney,
  formatFocusMinutes,
  GrowthTodoStatus,
  PersonalSavingGoalStatus,
  type GrowthTodoDto,
} from '@furniture-erp/shared';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Flame,
  Sparkles,
  Target,
  Timer,
  Trophy,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { showPersonalToast } from '@/features/personal/feedback/personal-toast';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { personalGrowthRankingService } from '@/services/personal-growth-ranking.service';

import { useGrowthFocusStats } from '../../growth/hooks/use-growth-focus';
import { useTodayGrowthProgress } from '../../growth/hooks/use-growth-habits';
import { useGrowthProgress } from '../../growth/hooks/use-growth-xp';
import {
  useTodayGrowthTodos,
  useUpdateGrowthTodo,
} from '../../growth/hooks/use-growth-todos';
import { usePersonalSummary } from '../../ledger/hooks/use-personal-ledger';
import { usePersonalBudgets, usePersonalSavingGoals } from '../../planning/hooks/use-personal-planning';
import { usePersonalPlanDay } from '../../plan/hooks/use-personal-plan';

function utcTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function formatTodayLabel(locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Hierarchy: Finance → Today/Action → Growth → Global Ranking preview.
 * Uses existing APIs only — no duplicate XP/rank math on the client.
 */
export function PersonalDashboardPage() {
  const { t, i18n } = useTranslation();
  const summary = usePersonalSummary();
  const budgets = usePersonalBudgets();
  const goals = usePersonalSavingGoals();
  const todayKey = utcTodayKey();
  const dayPlan = usePersonalPlanDay(todayKey);
  const todayTodos = useTodayGrowthTodos();
  const updateTodo = useUpdateGrowthTodo();
  const focusStats = useGrowthFocusStats();
  const todayProgress = useTodayGrowthProgress();
  const growthProgress = useGrowthProgress();
  const ranking = useQuery({
    queryKey: ['personal', 'monthly-competition'],
    queryFn: ({ signal }) => personalGrowthRankingService.monthlyCompetition(signal),
  });
  const [selectedTodo, setSelectedTodo] = useState<GrowthTodoDto | null>(null);

  const openFocusTodos = useMemo(
    () => (todayTodos.data?.focus ?? []).filter((todo) => todo.status !== GrowthTodoStatus.DONE),
    [todayTodos.data?.focus],
  );

  const budgetUsagePercent = useMemo(() => {
    const items = budgets.data?.items ?? [];
    if (items.length === 0) return null;
    const avg = items.reduce((sum, row) => sum + (row.percent ?? 0), 0) / items.length;
    return Math.round(avg);
  }, [budgets.data?.items]);

  const topGoal = useMemo(() => {
    return (goals.data?.items ?? []).find((g) => g.status === PersonalSavingGoalStatus.ACTIVE) ?? null;
  }, [goals.data?.items]);

  const nextAction = useMemo(() => {
    const firstTodo = openFocusTodos[0];
    if (firstTodo) {
      const focusTo = firstTodo.estimatedMinutes
        ? `${ROUTES.personalGrowthFocus}?todoId=${firstTodo.id}&minutes=${firstTodo.estimatedMinutes}`
        : `${ROUTES.personalGrowthFocus}?todoId=${firstTodo.id}`;
      return {
        title: t('personal.homeNextActionTask', { title: firstTodo.title }),
        cta: t('personal.homeNextActionStart'),
        to: focusTo,
      };
    }
    if ((todayProgress.data?.habitsDue ?? 0) > (todayProgress.data?.habitsDone ?? 0)) {
      return {
        title: t('personal.homeNextActionHabits'),
        cta: t('personal.homeNextActionHabitsCta'),
        to: ROUTES.personalGrowthHabits,
      };
    }
    if ((dayPlan.data?.items.length ?? 0) === 0) {
      return {
        title: t('personal.homeNextActionPlanEmpty'),
        cta: t('personal.homeNextActionPlanCta'),
        to: ROUTES.personalPlan,
      };
    }
    return {
      title: t('personal.homeNextActionFocus'),
      cta: t('personal.focusStart'),
      to: ROUTES.personalGrowthFocus,
    };
  }, [dayPlan.data?.items.length, openFocusTodos, t, todayProgress.data]);

  const locale = i18n.language?.startsWith('ru') ? 'ru-RU' : 'uz-UZ';
  const podium = ranking.data?.top3 ?? [];
  const myRank = ranking.data?.myEntry;

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <p className="text-xs font-medium text-ink-muted">{formatTodayLabel(locale)}</p>
        <h1 className="pf-page-title mt-0.5">{t('personal.homeTitle')}</h1>
        <p className="pf-page-hint">{t('personal.homeHint')}</p>
      </div>

      {/* 1. FINANCE */}
      {summary.isPending && !summary.data ? (
        <Skeleton className="h-36 w-full rounded-2xl" />
      ) : summary.isError ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void summary.refetch()}
        />
      ) : (
        <section className="space-y-3">
          <div className="pf-hero-balance">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="pf-hero-label">{t('personal.totalBalance')}</p>
                <p className="pf-hero-value">{formatMoney(summary.data?.totalBalanceSom ?? 0)}</p>
              </div>
              <Link
                to={ROUTES.personalFinance}
                className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25"
              >
                {t('personal.navFinance')}
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
              <div>
                <p className="text-[11px] text-white/70">{t('personal.monthIncome')}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-200">
                  {formatMoney(summary.data?.monthIncomeSom ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-white/70">{t('personal.monthExpense')}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-rose-200">
                  {formatMoney(summary.data?.monthExpenseSom ?? 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to={ROUTES.personalBudgets} className="pf-card block p-3.5 hover:bg-surface-hover">
              <p className="text-[11px] text-ink-muted">{t('personal.homeBudgetUsage')}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-ink">
                {budgetUsagePercent == null ? '—' : `${budgetUsagePercent}%`}
              </p>
            </Link>
            <Link to={ROUTES.personalGoals} className="pf-card block p-3.5 hover:bg-surface-hover">
              <p className="text-[11px] text-ink-muted">{t('personal.homeGoalProgress')}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-ink">
                {topGoal ? `${topGoal.percent}%` : '—'}
              </p>
              {topGoal ? (
                <p className="mt-0.5 truncate text-[11px] text-ink-muted">{topGoal.name}</p>
              ) : null}
            </Link>
          </div>
        </section>
      )}

      {/* 2. TODAY / ACTION */}
      <section className="pf-card p-4">
        <p className="text-xs font-medium text-ink-muted">{t('personal.homeNextLabel')}</p>
        <p className="mt-1 text-sm font-semibold text-ink">{nextAction.title}</p>
        <Link to={nextAction.to} className="pf-btn-primary mt-3 inline-flex w-full sm:w-auto">
          {nextAction.cta}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </section>

      <section className="pf-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="pf-section-title">{t('personal.homeTodayProgress')}</h2>
          <span className="text-sm font-semibold tabular-nums text-brand-700">
            {todayProgress.data?.percent ?? 0}%
          </span>
        </div>
        <div className="pf-progress-track mt-3">
          <div className="pf-progress-fill" style={{ width: `${todayProgress.data?.percent ?? 0}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MiniStat
            icon={Target}
            label={t('personal.homeTodayTasks')}
            value={String(openFocusTodos.length)}
            to={ROUTES.personalGrowthTodos}
          />
          <MiniStat
            icon={Flame}
            tone="streak"
            label={t('personal.growth.habits')}
            value={
              todayProgress.data
                ? `${todayProgress.data.habitsDone}/${Math.max(todayProgress.data.habitsDue, todayProgress.data.habitsDone)}`
                : '—'
            }
            to={ROUTES.personalGrowthHabits}
          />
          <MiniStat
            icon={Timer}
            label={t('personal.homeFocus')}
            value={
              focusStats.data
                ? formatFocusMinutes(focusStats.data.stats.todayMinutes)
                : t('personal.homeStatSoon')
            }
            to={ROUTES.personalGrowthFocus}
          />
        </div>
      </section>

      <section className="pf-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 pf-section-title">
            <Target className="size-4 text-brand-600" aria-hidden="true" />
            {t('personal.homeTodayTasks')}
          </h2>
          <Link
            to={ROUTES.personalGrowthTodos}
            className="text-xs font-semibold text-brand-600 hover:underline"
          >
            {t('personal.allTasks')}
          </Link>
        </div>
        {todayTodos.isPending && !todayTodos.data ? (
          <Skeleton className="mt-3 h-16 w-full" />
        ) : (todayTodos.data?.focus.length ?? 0) === 0 ? (
          <EmptyState
            icon={Target}
            title={t('personal.homeTodayTasksEmptyTitle')}
            description={t('personal.homeTodayTasksEmpty')}
            action={
              <Link to={`${ROUTES.personalGrowthTodos}?compose=1`} className="pf-btn-secondary text-sm">
                {t('personal.todoAdd')}
              </Link>
            }
            className="py-5"
          />
        ) : (
          <ul className="mt-3 space-y-2">
            {todayTodos.data?.focus.slice(0, 3).map((todo) => {
              const done = todo.status === GrowthTodoStatus.DONE;
              return (
                <li key={todo.id} className="flex items-center gap-2.5 text-sm">
                  <button
                    type="button"
                    disabled={updateTodo.isPending || done}
                    aria-label={t('personal.todoMarkDone')}
                    className={cn('pf-check', done && 'pf-check--done')}
                    onClick={() => {
                      void updateTodo
                        .mutateAsync({ id: todo.id, body: { status: GrowthTodoStatus.DONE } })
                        .then(() => {
                          showPersonalToast({ message: t('personal.toastTaskDone'), tone: 'success' });
                        });
                    }}
                  >
                    <Check className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTodo(todo)}
                    className={cn(
                      'min-w-0 flex-1 truncate text-left hover:underline',
                      done ? 'text-ink-muted line-through' : 'text-ink',
                    )}
                  >
                    {todo.title}
                  </button>
                  {todo.estimatedMinutes ? (
                    <span className="shrink-0 tabular-nums text-xs text-ink-muted">
                      {todo.estimatedMinutes} {t('personal.plan.minutes')}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="pf-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 pf-section-title">
            <CalendarDays className="size-4 text-brand-600" aria-hidden="true" />
            {t('personal.homeTodayPlan')}
          </h2>
          <Link to={ROUTES.personalPlan} className="text-xs font-semibold text-brand-600 hover:underline">
            {t('personal.navPlan')}
          </Link>
        </div>
        {dayPlan.isPending && !dayPlan.data ? (
          <Skeleton className="mt-3 h-16 w-full" />
        ) : (dayPlan.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={t('personal.homeTodayPlanEmptyTitle')}
            description={t('personal.homeTodayPlanEmpty')}
            action={
              <Link to={ROUTES.personalPlan} className="pf-btn-secondary text-sm">
                {t('personal.plan.add')}
              </Link>
            }
            className="py-5"
          />
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

      {/* 3. GROWTH */}
      <section className="pf-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 pf-section-title">
            <Sparkles className="size-4 text-brand-600" aria-hidden="true" />
            {t('personal.navGrowth')}
          </h2>
          <Link
            to={ROUTES.personalGrowthLevel}
            className="text-xs font-semibold text-brand-600 hover:underline"
          >
            {t('personal.growth.level')}
          </Link>
        </div>
        {growthProgress.isPending && !growthProgress.data ? (
          <Skeleton className="mt-3 h-20 w-full" />
        ) : growthProgress.data ? (
          <>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-ink-muted">{t('personal.levelLabel')}</p>
                <p className="text-2xl font-semibold tabular-nums text-ink">{growthProgress.data.level}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-muted">{t('personal.homeStreak')}</p>
                <p className="text-sm font-semibold tabular-nums text-warning-600">
                  {growthProgress.data.currentStreak}
                </p>
              </div>
            </div>
            <div className="pf-progress-track mt-3">
              <div className="pf-progress-fill" style={{ width: `${growthProgress.data.percent}%` }} />
            </div>
            <p className="mt-2 text-xs text-ink-muted tabular-nums">
              {growthProgress.data.xpIntoLevel} / {growthProgress.data.xpForNextLevel} XP
              {' · '}
              +{growthProgress.data.todayXp} {t('personal.levelTodayXp')}
            </p>
          </>
        ) : null}
      </section>

      {/* 4. GLOBAL RANKING PREVIEW */}
      <section className="pf-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 pf-section-title">
            <Trophy className="size-4 text-brand-600" aria-hidden="true" />
            {t('personal.rankingTitle')}
          </h2>
          <Link to={ROUTES.personalRanking} className="text-xs font-semibold text-brand-600 hover:underline">
            {t('personal.rankingOpen')}
          </Link>
        </div>
        {ranking.isPending && !ranking.data ? (
          <Skeleton className="mt-3 h-24 w-full" />
        ) : podium.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">{t('personal.rankingEmpty')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {podium.map((entry, index) => (
              <li
                key={entry.identityId}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="mr-2 tabular-nums text-ink-muted">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} #{entry.rank}
                  </span>
                  <span className="font-medium text-ink">{entry.displayName}</span>
                </span>
                <span className="shrink-0 tabular-nums text-xs text-ink-muted">
                  Lv {entry.level} · {entry.periodXp} XP
                </span>
              </li>
            ))}
          </ul>
        )}
        {myRank && myRank.rank > 0 ? (
          <div className="mt-3 rounded-xl bg-brand-50 px-3 py-2.5 text-sm">
            <p className="text-xs font-medium text-brand-700">{t('personal.rankingYourPosition')}</p>
            <p className="mt-0.5 font-semibold tabular-nums text-ink">
              #{myRank.rank} · Lv {myRank.level} · {myRank.periodXp} XP
            </p>
            {ranking.data?.xpToTop3 != null && ranking.data.xpToTop3 > 0 ? (
              <p className="mt-1 text-xs text-ink-muted">
                {t('personal.rankingXpToTop3', { count: ranking.data.xpToTop3 })}
              </p>
            ) : null}
          </div>
        ) : null}
        <Link to={ROUTES.personalRanking} className="pf-btn-secondary mt-3 inline-flex w-full text-sm">
          {t('personal.rankingOpen')}
        </Link>
      </section>

      <Dialog
        open={Boolean(selectedTodo)}
        title={selectedTodo?.title ?? t('personal.growth.todo')}
        onClose={() => setSelectedTodo(null)}
      >
        {selectedTodo ? (
          <div className="space-y-3 text-sm">
            {selectedTodo.description ? <p className="text-ink-muted">{selectedTodo.description}</p> : null}
            <button
              type="button"
              disabled={updateTodo.isPending || selectedTodo.status === GrowthTodoStatus.DONE}
              className="pf-btn-primary w-full"
              onClick={() => {
                void updateTodo
                  .mutateAsync({
                    id: selectedTodo.id,
                    body: { status: GrowthTodoStatus.DONE },
                  })
                  .then(() => {
                    showPersonalToast({ message: t('personal.toastTaskDone'), tone: 'success' });
                    setSelectedTodo(null);
                  });
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

function MiniStat({
  icon: Icon,
  label,
  value,
  tone,
  to,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  tone?: 'streak';
  to: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl bg-surface-muted/70 px-2 py-2.5 text-center transition-colors hover:bg-surface-muted"
    >
      <Icon
        className={cn('mx-auto size-3.5', tone === 'streak' ? 'text-warning-500' : 'text-brand-600')}
        aria-hidden="true"
      />
      <p className="mt-1 text-[10px] leading-tight text-ink-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{value}</p>
    </Link>
  );
}
