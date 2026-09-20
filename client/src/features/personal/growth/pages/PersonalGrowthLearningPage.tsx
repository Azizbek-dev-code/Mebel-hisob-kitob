import {
  GrowthLearningCategory,
  GrowthLearningGoalStatus,
  formatFocusMinutes,
  type CreateGrowthLearningGoalRequest,
  type GrowthLearningGoalDto,
} from '@furniture-erp/shared';
import { BookOpen, Check, Plus } from 'lucide-react';
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
  useCreateGrowthLearningGoal,
  useGrowthLearningGoals,
  useLogGrowthLearningSession,
  useUpdateGrowthLearningGoal,
} from '../hooks/use-growth-learning';
import { useCreateGrowthTodo, useGrowthTodos } from '../hooks/use-growth-todos';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export function PersonalGrowthLearningPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);
  const [composerOpen, setComposerOpen] = useState(false);
  const [logGoalId, setLogGoalId] = useState<string | null>(null);

  const list = useGrowthLearningGoals();
  const items = useMemo(() => list.data?.items ?? [], [list.data?.items]);

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
            {t('personal.learningTitle')}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{t('personal.learningHint')}</p>
        </div>
        <button
          type="button"
          disabled={!canWrite}
          onClick={() => setComposerOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t('personal.learningAdd')}
        </button>
      </div>

      {list.data ? (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-line bg-surface px-3 py-3">
            <p className="text-[10px] text-ink-muted">{t('personal.learningToday')}</p>
            <p className="mt-0.5 text-sm font-semibold text-ink">
              {formatFocusMinutes(list.data.todayStudyMinutes)}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface px-3 py-3">
            <p className="text-[10px] text-ink-muted">{t('personal.learningWeek')}</p>
            <p className="mt-0.5 text-sm font-semibold text-ink">
              {formatFocusMinutes(list.data.weekStudyMinutes)}
            </p>
          </div>
        </div>
      ) : null}

      {list.isPending && !list.data ? (
        <Skeleton className="h-40 w-full" />
      ) : list.isError ? (
        <ErrorState
          title={t('personal.learningLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void list.refetch()}
        />
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-muted">
          {t('personal.learningEmpty')}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((goal) => (
            <LearningGoalCard
              key={goal.id}
              goal={goal}
              canWrite={canWrite}
              onLog={() => setLogGoalId(goal.id)}
            />
          ))}
        </ul>
      )}

      {composerOpen ? <LearningComposer onClose={() => setComposerOpen(false)} /> : null}
      {logGoalId ? (
        <LogSessionDialog goalId={logGoalId} onClose={() => setLogGoalId(null)} />
      ) : null}
    </div>
  );
}

function LearningGoalCard({
  goal,
  canWrite,
  onLog,
}: {
  goal: GrowthLearningGoalDto;
  canWrite: boolean;
  onLog: () => void;
}) {
  const { t } = useTranslation();
  const update = useUpdateGrowthLearningGoal();
  const done = goal.status === GrowthLearningGoalStatus.COMPLETED;

  return (
    <li className="rounded-2xl border border-line bg-surface p-3.5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <BookOpen className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={cn('text-sm font-semibold text-ink', done && 'text-ink-muted')}>
                {goal.title}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {t(`personal.learningCategory.${goal.category}`)}
                {` · ${goal.currentValue}/${goal.targetValue} ${goal.targetUnit}`}
                {` · ${formatFocusMinutes(goal.totalStudyMinutes)}`}
                {goal.dailyMinutes
                  ? ` · ${t('personal.learningFieldDaily')}: ${goal.dailyMinutes}`
                  : ''}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-brand-800">
              {goal.progressPercent}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${goal.progressPercent}%` }}
            />
          </div>
          {goal.milestones.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {goal.milestones.slice(0, 3).map((m) => (
                <li key={m.id} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                  <Check
                    className={cn('size-3', m.isReached ? 'text-brand-600' : 'text-ink-subtle')}
                    aria-hidden="true"
                  />
                  <span className={cn(m.isReached && 'line-through')}>{m.title}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {canWrite && !done ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onLog}
                className="rounded-input border border-line px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-hover"
              >
                {t('personal.learningLog')}
              </button>
              <button
                type="button"
                disabled={update.isPending}
                onClick={() =>
                  void update.mutateAsync({
                    id: goal.id,
                    body: { status: GrowthLearningGoalStatus.COMPLETED },
                  })
                }
                className="rounded-input border border-line px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-hover"
              >
                {t('personal.learningComplete')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

const LEARNING_STEPS = 8;

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
}

function LearningComposer({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateGrowthLearningGoal();
  const todos = useGrowthTodos();
  const createTodo = useCreateGrowthTodo();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(GrowthLearningCategory.COURSE);
  const [description, setDescription] = useState('');
  const [deadlineMode, setDeadlineMode] = useState<'date' | 'duration'>('duration');
  const [deadline, setDeadline] = useState('');
  const [durationAmount, setDurationAmount] = useState(4);
  const [durationUnit, setDurationUnit] = useState<'day' | 'week' | 'month'>('week');
  const [startDate, setStartDate] = useState(toDateInputValue(new Date()));
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [todoIds, setTodoIds] = useState<string[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [milestone, setMilestone] = useState('');
  const [error, setError] = useState<string | null>(null);

  function canAdvance(): boolean {
    if (step === 0) return title.trim().length > 0;
    if (step === 3 && deadlineMode === 'date') return Boolean(deadline);
    if (step === 3 && deadlineMode === 'duration') return durationAmount >= 1;
    if (step === 4) return Boolean(startDate);
    if (step === 5) return dailyMinutes >= 1;
    return true;
  }

  async function onSubmit() {
    setError(null);
    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date();
    const durationDays =
      durationUnit === 'week' ? durationAmount * 7 : durationUnit === 'month' ? durationAmount * 30 : durationAmount;
    const periodDays =
      deadlineMode === 'date' && deadline
        ? daysBetween(start, new Date(`${deadline}T00:00:00.000Z`))
        : durationDays;
    const targetValue = Math.max(1, dailyMinutes * Math.max(1, periodDays));
    const body: CreateGrowthLearningGoalRequest = {
      title: title.trim(),
      description: description.trim() || null,
      category: category as CreateGrowthLearningGoalRequest['category'],
      targetValue,
      targetUnit: 'minutes',
      currentValue: 0,
      startDate: start.toISOString(),
      dailyMinutes,
      linkedTodoIds: todoIds,
      ...(deadlineMode === 'date' && deadline
        ? { deadline: new Date(`${deadline}T00:00:00.000Z`).toISOString() }
        : { durationAmount, durationUnit }),
      milestones: milestone.trim()
        ? [{ title: milestone.trim(), targetValue: Math.max(1, targetValue * 0.5) }]
        : undefined,
    };
    try {
      await create.mutateAsync(body);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('personal.learningSaveFailed'));
    }
  }

  return (
    <Dialog open onClose={onClose} title={t('personal.learningAdd')} className="sm:max-w-md">
      <p className="mb-3 text-xs text-ink-muted">
        {t('personal.learningStepOf', { step: step + 1, total: LEARNING_STEPS })}
      </p>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (step < LEARNING_STEPS - 1) {
            if (canAdvance()) setStep((current) => current + 1);
            return;
          }
          void onSubmit();
        }}
      >
        {step === 0 ? (
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.learningFieldTitle')}</span>
            <input
              className={fieldClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('personal.learningTitlePlaceholder')}
              required
              maxLength={200}
              autoFocus
            />
          </label>
        ) : null}

        {step === 1 ? (
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.learningFieldCategory')}</span>
            <select
              className={fieldClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {Object.values(GrowthLearningCategory).map((value) => (
                <option key={value} value={value}>
                  {t(`personal.learningCategory.${value}`)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {step === 2 ? (
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.learningFieldNote')}</span>
            <textarea
              className={fieldClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </label>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={
                  deadlineMode === 'date'
                    ? 'rounded-input bg-brand-600 px-3 py-2 text-sm text-white'
                    : 'rounded-input border border-line px-3 py-2 text-sm text-ink-soft'
                }
                onClick={() => setDeadlineMode('date')}
              >
                {t('personal.learningDeadlineByDate')}
              </button>
              <button
                type="button"
                className={
                  deadlineMode === 'duration'
                    ? 'rounded-input bg-brand-600 px-3 py-2 text-sm text-white'
                    : 'rounded-input border border-line px-3 py-2 text-sm text-ink-soft'
                }
                onClick={() => setDeadlineMode('duration')}
              >
                {t('personal.learningDeadlineByDuration')}
              </button>
            </div>
            {deadlineMode === 'date' ? (
              <label className="block space-y-1 text-sm">
                <span className="text-ink-muted">{t('personal.learningFieldDeadline')}</span>
                <input
                  type="date"
                  className={fieldClass}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
              </label>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1 text-sm">
                  <span className="text-ink-muted">{t('personal.learningFieldDuration')}</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    className={fieldClass}
                    value={durationAmount}
                    onChange={(e) => setDurationAmount(Number(e.target.value) || 1)}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-ink-muted">{t('personal.learningFieldUnit')}</span>
                  <select
                    className={fieldClass}
                    value={durationUnit}
                    onChange={(e) =>
                      setDurationUnit(e.target.value as 'day' | 'week' | 'month')
                    }
                  >
                    <option value="day">{t('personal.learningDurationDay')}</option>
                    <option value="week">{t('personal.learningDurationWeek')}</option>
                    <option value="month">{t('personal.learningDurationMonth')}</option>
                  </select>
                </label>
              </div>
            )}
          </div>
        ) : null}

        {step === 4 ? (
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.learningFieldStart')}</span>
            <input
              type="date"
              className={fieldClass}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
        ) : null}

        {step === 5 ? (
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.learningFieldDaily')}</span>
            <input
              type="number"
              min={1}
              max={480}
              className={fieldClass}
              value={dailyMinutes}
              onChange={(e) => setDailyMinutes(Number(e.target.value) || 1)}
              required
            />
          </label>
        ) : null}

        {step === 6 ? (
          <fieldset className="space-y-2">
            <legend className="text-sm text-ink-muted">{t('personal.learningFieldTodos')}</legend>
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {(todos.data?.items ?? []).map((todo) => (
                <li key={todo.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={todoIds.includes(todo.id)}
                      onChange={() =>
                        setTodoIds((prev) =>
                          prev.includes(todo.id)
                            ? prev.filter((id) => id !== todo.id)
                            : [...prev, todo.id],
                        )
                      }
                    />
                    {todo.title}
                  </label>
                </li>
              ))}
            </ul>
            <input
              className={fieldClass}
              value={newTodo}
              placeholder={t('personal.learningAddTask')}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                const nextTitle = newTodo.trim();
                if (!nextTitle) return;
                void createTodo.mutateAsync({ title: nextTitle }).then((created) => {
                  setTodoIds((prev) => [...prev, created.todo.id]);
                  setNewTodo('');
                });
              }}
            />
          </fieldset>
        ) : null}

        {step === 7 ? (
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.learningFieldMilestone')}</span>
            <input
              className={fieldClass}
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              placeholder={t('personal.learningMilestonePlaceholder')}
            />
          </label>
        ) : null}

        {error ? (
          <p className="text-sm text-danger-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => (step === 0 ? onClose() : setStep((current) => current - 1))}
            className="rounded-input border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface-hover"
          >
            {step === 0 ? t('common.cancel') : t('personal.learningStepBack')}
          </button>
          <button
            type="submit"
            disabled={create.isPending || !canAdvance()}
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {create.isPending
              ? t('app.loading')
              : step < LEARNING_STEPS - 1
                ? t('personal.learningStepNext')
                : t('common.save')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function LogSessionDialog({ goalId, onClose }: { goalId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const log = useLogGrowthLearningSession();
  const [minutes, setMinutes] = useState('30');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await log.mutateAsync({
        goalId,
        minutes: Number(minutes),
        note: note.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('personal.learningLogFailed'));
    }
  }

  return (
    <Dialog open onClose={onClose} title={t('personal.learningLog')} className="sm:max-w-sm">
      <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.learningFieldMinutes')}</span>
          <input
            type="number"
            min={1}
            max={240}
            className={fieldClass}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.learningFieldNote')}</span>
          <input
            className={fieldClass}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />
        </label>
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
            disabled={log.isPending}
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {log.isPending ? t('app.loading') : t('common.save')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
