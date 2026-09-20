import {
  GROWTH_FOCUS_PRESETS,
  GrowthFocusKind,
  formatFocusMinutes,
  type GrowthTodoDto,
} from '@furniture-erp/shared';
import { Pause, Play, Square } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { useGrowthHabits } from '@/features/personal/growth/hooks/use-growth-habits';
import { useGrowthTodos } from '@/features/personal/growth/hooks/use-growth-todos';
import {
  useCompleteGrowthFocus,
  useGrowthFocusStats,
  useStartGrowthFocus,
} from '@/features/personal/growth/hooks/use-growth-focus';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function PersonalGrowthFocusPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);
  const [params] = useSearchParams();
  const presetTodoId = params.get('todoId');
  const presetHabitId = params.get('habitId');
  const presetMinutes = Number(params.get('minutes') ?? '');

  const statsQuery = useGrowthFocusStats();
  const todos = useGrowthTodos('OPEN');
  const habits = useGrowthHabits();
  const start = useStartGrowthFocus();
  const complete = useCompleteGrowthFocus();

  const [plannedMinutes, setPlannedMinutes] = useState(
    Number.isFinite(presetMinutes) && presetMinutes > 0 ? Math.min(90, presetMinutes) : 25,
  );
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [todoId, setTodoId] = useState<string>(presetTodoId ?? '');
  const [habitId, setHabitId] = useState<string>(presetHabitId ?? '');
  const [customMinutes, setCustomMinutes] = useState(
    Number.isFinite(presetMinutes) && presetMinutes > 0 ? String(Math.min(90, presetMinutes)) : '25',
  );
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(() => Date.now());

  const active = statsQuery.data?.stats.activeSession ?? null;
  const stats = statsQuery.data?.stats;

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active?.id]);

  useEffect(() => {
    if (presetTodoId) setTodoId(presetTodoId);
  }, [presetTodoId]);

  useEffect(() => {
    if (presetHabitId) setHabitId(presetHabitId);
  }, [presetHabitId]);

  const linkedHabit = habits.data?.items.find((item) => item.id === (active?.habitId ?? habitId));

  const remainingSeconds = useMemo(() => {
    if (!active) return plannedMinutes * 60;
    const elapsed = Math.floor((tick - new Date(active.startedAt).getTime()) / 1000);
    return Math.max(0, active.plannedMinutes * 60 - elapsed);
  }, [active, plannedMinutes, tick]);

  const openTodos = (todos.data?.items ?? []) as GrowthTodoDto[];

  async function onStart(kind: 'FOCUS' | 'BREAK' = 'FOCUS') {
    setError(null);
    const minutes =
      kind === 'BREAK'
        ? breakMinutes
        : Number(customMinutes) > 0
          ? Number(customMinutes)
          : plannedMinutes;
    try {
      await start.mutateAsync({
        plannedMinutes: minutes,
        kind: kind === 'BREAK' ? GrowthFocusKind.BREAK : GrowthFocusKind.FOCUS,
        todoId: kind === 'FOCUS' && todoId ? todoId : null,
        habitId: kind === 'FOCUS' && habitId ? habitId : null,
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('personal.focusStartFailed'));
    }
  }

  async function onFinish(interrupted: boolean) {
    if (!active) return;
    setError(null);
    const elapsed = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000);
    try {
      await complete.mutateAsync({
        id: active.id,
        body: { interrupted, clientReportedSeconds: elapsed },
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('personal.focusCompleteFailed'));
    }
  }

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <p className="text-xs font-medium text-brand-700">
          <Link to={ROUTES.personalGrowth} className="hover:underline">
            {t('personal.navGrowth')}
          </Link>
        </p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink">
          {t('personal.focusTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.focusHint')}</p>
      </div>

      {statsQuery.isPending && !statsQuery.data ? (
        <Skeleton className="h-24 w-full" />
      ) : statsQuery.isError ? (
        <ErrorState
          title={t('personal.focusLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void statsQuery.refetch()}
        />
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          <Stat
            label={t('personal.focusToday')}
            value={formatFocusMinutes(stats?.todayMinutes ?? 0)}
          />
          <Stat
            label={t('personal.focusWeek')}
            value={formatFocusMinutes(stats?.weekMinutes ?? 0)}
          />
          <Stat
            label={t('personal.focusMonth')}
            value={formatFocusMinutes(stats?.monthMinutes ?? 0)}
          />
        </div>
      )}

      <section className="rounded-2xl border border-line bg-surface px-4 py-8 text-center shadow-card">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          {active
            ? active.kind === 'BREAK'
              ? t('personal.focusBreakRunning')
              : t('personal.focusRunning')
            : t('personal.focusReady')}
        </p>
        <p className="mt-3 font-semibold tabular-nums tracking-tight text-ink text-5xl sm:text-6xl">
          {formatCountdown(remainingSeconds)}
        </p>
        {active?.habitTitle || linkedHabit?.title ? (
          <p className="mt-3 text-sm text-ink-soft">{active?.habitTitle ?? linkedHabit?.title}</p>
        ) : active?.todoTitle ? (
          <p className="mt-3 text-sm text-ink-soft">{active.todoTitle}</p>
        ) : null}

        <div className="mt-6 flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
          {!active ? (
            <button
              type="button"
              disabled={!canWrite || start.isPending}
              onClick={() => void onStart('FOCUS')}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              <Play className="size-4" aria-hidden="true" />
              {t('personal.focusStart')}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={complete.isPending}
                onClick={() => void onFinish(false)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                <Square className="size-4" aria-hidden="true" />
                {t('personal.focusComplete')}
              </button>
              <button
                type="button"
                disabled={complete.isPending}
                onClick={() => void onFinish(true)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-input border border-line px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface-hover disabled:opacity-60"
              >
                <Pause className="size-4" aria-hidden="true" />
                {t('personal.focusInterrupt')}
              </button>
            </>
          )}
        </div>
        {error ? (
          <p className="mt-4 text-sm text-danger-700" role="alert">
            {error}
          </p>
        ) : null}
        <p className="mx-auto mt-4 max-w-sm text-xs text-ink-muted">{t('personal.focusAntiCheat')}</p>
      </section>

      {!active ? (
        <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm font-semibold text-ink">{t('personal.focusPresets')}</p>
          <div className="flex flex-wrap gap-2">
            {GROWTH_FOCUS_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setPlannedMinutes(preset.focusMinutes);
                  setBreakMinutes(preset.breakMinutes);
                  setCustomMinutes(String(preset.focusMinutes));
                }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium',
                  plannedMinutes === preset.focusMinutes
                    ? 'border-brand-200 bg-brand-50 text-brand-800'
                    : 'border-line text-ink-soft hover:bg-surface-hover',
                )}
              >
                {preset.focusMinutes}/{preset.breakMinutes}
              </button>
            ))}
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.focusCustom')}</span>
            <input
              type="number"
              min={1}
              max={90}
              value={customMinutes}
              onChange={(e) => {
                setCustomMinutes(e.target.value);
                const n = Number(e.target.value);
                if (n > 0) setPlannedMinutes(n);
              }}
              className="w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.focusLinkTodo')}</span>
            <select
              value={todoId}
              onChange={(e) => setTodoId(e.target.value)}
              className="w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">{t('personal.focusNoTodo')}</option>
              {openTodos.map((todo) => (
                <option key={todo.id} value={todo.id}>
                  {todo.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!canWrite || start.isPending}
            onClick={() => void onStart('BREAK')}
            className="w-full rounded-input border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface-hover disabled:opacity-60"
          >
            {t('personal.focusStartBreak', { minutes: breakMinutes })}
          </button>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-2.5 py-3 text-center">
      <p className="text-[10px] text-ink-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}
