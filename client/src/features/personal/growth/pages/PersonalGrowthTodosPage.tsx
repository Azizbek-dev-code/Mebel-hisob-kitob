import {
  GrowthEventPriority,
  GrowthTodoStatus,
  suggestTodoFromTitle,
  type CreateGrowthTodoRequest,
  type GrowthTodoDto,
} from '@furniture-erp/shared';
import { Check, Plus, Star, Timer } from 'lucide-react';
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
  useCreateGrowthTodo,
  useGrowthTodos,
  useUpdateGrowthTodo,
} from '../hooks/use-growth-todos';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export function PersonalGrowthTodosPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);
  const [filter, setFilter] = useState<'OPEN' | 'DONE' | 'all'>('OPEN');
  const [composerOpen, setComposerOpen] = useState(false);

  const list = useGrowthTodos(filter === 'all' ? undefined : filter);

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
            {t('personal.todoTitle')}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{t('personal.todoHint')}</p>
        </div>
        <button
          type="button"
          disabled={!canWrite}
          onClick={() => setComposerOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t('personal.todoAdd')}
        </button>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ['OPEN', t('personal.todoFilterOpen')],
            ['DONE', t('personal.todoFilterDone')],
            ['all', t('personal.todoFilterAll')],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              'min-h-10 shrink-0 rounded-full border px-3 text-xs font-medium',
              filter === key
                ? 'border-brand-200 bg-brand-50 text-brand-800'
                : 'border-line bg-surface text-ink-soft hover:bg-surface-hover',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {list.data ? (
        <p className="text-xs text-ink-muted">
          {t('personal.todoStats', {
            open: list.data.openCount,
            done: list.data.doneTodayCount,
          })}
        </p>
      ) : null}

      {list.isPending && !list.data ? (
        <Skeleton className="h-40 w-full" />
      ) : list.isError ? (
        <ErrorState
          title={t('personal.todoLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void list.refetch()}
        />
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-muted">
          {t('personal.todoEmpty')}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((todo) => (
            <TodoRow key={todo.id} todo={todo} canWrite={canWrite} />
          ))}
        </ul>
      )}

      {composerOpen ? <TodoComposer onClose={() => setComposerOpen(false)} /> : null}
    </div>
  );
}

function TodoRow({ todo, canWrite }: { todo: GrowthTodoDto; canWrite: boolean }) {
  const { t } = useTranslation();
  const update = useUpdateGrowthTodo();
  const open = todo.status === GrowthTodoStatus.TODO || todo.status === GrowthTodoStatus.IN_PROGRESS;

  return (
    <li className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-3 py-3">
      <button
        type="button"
        disabled={!canWrite || update.isPending || !open}
        aria-label={t('personal.todoMarkDone')}
        className={cn(
          'mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border',
          open
            ? 'border-line-strong text-transparent hover:border-brand-500 hover:text-brand-600'
            : 'border-brand-500 bg-brand-500 text-white',
        )}
        onClick={() =>
          void update.mutateAsync({ id: todo.id, body: { status: GrowthTodoStatus.DONE } })
        }
      >
        <Check className="size-4" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium text-ink', !open && 'text-ink-muted line-through')}>
          {todo.title}
        </p>
        <p className="mt-0.5 text-xs text-ink-muted">
          {t(`personal.plan.priority.${todo.priority}`)}
          {todo.estimatedMinutes
            ? ` · ${todo.estimatedMinutes} ${t('personal.plan.minutes')}`
            : ''}
          {todo.category ? ` · ${todo.category}` : ''}
          {todo.isDailyFocus ? ` · ${t('personal.todoDailyFocus')}` : ''}
        </p>
      </div>
      {canWrite && open ? (
        <div className="flex shrink-0 items-center gap-1">
          <Link
            to={`${ROUTES.personalGrowthFocus}?todoId=${todo.id}`}
            className="flex size-11 items-center justify-center rounded-input text-ink-subtle hover:bg-surface-hover hover:text-brand-700"
            title={t('personal.focusStart')}
            aria-label={t('personal.focusStart')}
          >
            <Timer className="size-5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            disabled={update.isPending}
            title={t('personal.todoToggleFocus')}
            aria-label={t('personal.todoToggleFocus')}
            className={cn(
              'flex size-11 items-center justify-center rounded-input',
              todo.isDailyFocus ? 'text-brand-700' : 'text-ink-subtle hover:text-brand-700',
            )}
            onClick={() =>
              void update.mutateAsync({
                id: todo.id,
                body: { isDailyFocus: !todo.isDailyFocus },
              })
            }
          >
            <Star className={cn('size-4', todo.isDailyFocus && 'fill-current')} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </li>
  );
}

function TodoComposer({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateGrowthTodo();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [priority, setPriority] = useState<string>(GrowthEventPriority.MEDIUM);
  const [category, setCategory] = useState('');
  const [isDailyFocus, setIsDailyFocus] = useState(false);
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applySmartHints(nextTitle: string) {
    setTitle(nextTitle);
    const hint = suggestTodoFromTitle(nextTitle);
    if (hint.estimatedMinutes != null) setEstimatedMinutes(String(hint.estimatedMinutes));
    setPriority(hint.priority);
    if (hint.category) setCategory(hint.category);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const body: CreateGrowthTodoRequest = {
      title: title.trim(),
      description: description.trim() || null,
      priority: priority as CreateGrowthTodoRequest['priority'],
      category: category.trim() || null,
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      isDailyFocus,
      addToCalendar,
    };
    try {
      await create.mutateAsync(body);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('personal.todoSaveFailed'));
    }
  }

  return (
    <Dialog open onClose={onClose} title={t('personal.todoAdd')} className="sm:max-w-md">
      <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.todoFieldTitle')}</span>
          <input
            className={fieldClass}
            value={title}
            onChange={(e) => applySmartHints(e.target.value)}
            placeholder={t('personal.todoTitlePlaceholder')}
            required
            maxLength={200}
          />
          <span className="block text-[11px] text-ink-subtle">{t('personal.todoSmartHint')}</span>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.todoFieldDescription')}</span>
          <textarea
            className={cn(fieldClass, 'min-h-16 resize-y')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.plan.fieldPriority')}</span>
            <select
              className={fieldClass}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {Object.values(GrowthEventPriority).map((value) => (
                <option key={String(value)} value={String(value)}>
                  {t(`personal.plan.priority.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.todoFieldEstimate')}</span>
            <input
              type="number"
              min={1}
              max={1440}
              className={fieldClass}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              placeholder="30"
            />
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.plan.fieldCategory')}</span>
          <input
            className={fieldClass}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={isDailyFocus}
            onChange={(e) => setIsDailyFocus(e.target.checked)}
            className="size-4 rounded border-line-strong"
          />
          {t('personal.todoDailyFocus')}
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={addToCalendar}
            onChange={(e) => setAddToCalendar(e.target.checked)}
            className="size-4 rounded border-line-strong"
          />
          {t('personal.todoAddToCalendar')}
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
