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

function LearningComposer({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateGrowthLearningGoal();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(GrowthLearningCategory.IELTS);
  const [targetValue, setTargetValue] = useState('7');
  const [targetUnit, setTargetUnit] = useState('score');
  const [currentValue, setCurrentValue] = useState('0');
  const [milestone, setMilestone] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const body: CreateGrowthLearningGoalRequest = {
      title: title.trim(),
      category: category as CreateGrowthLearningGoalRequest['category'],
      targetValue: Number(targetValue),
      targetUnit: targetUnit.trim() || 'score',
      currentValue: Number(currentValue) || 0,
      milestones: milestone.trim()
        ? [{ title: milestone.trim(), targetValue: Number(targetValue) * 0.7 }]
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
      <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.learningFieldTitle')}</span>
          <input
            className={fieldClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('personal.learningTitlePlaceholder')}
            required
            maxLength={200}
          />
        </label>
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
        <div className="grid grid-cols-3 gap-2">
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.learningFieldTarget')}</span>
            <input
              type="number"
              step="any"
              min={0.1}
              className={fieldClass}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.learningFieldUnit')}</span>
            <input
              className={fieldClass}
              value={targetUnit}
              onChange={(e) => setTargetUnit(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.learningFieldCurrent')}</span>
            <input
              type="number"
              step="any"
              min={0}
              className={fieldClass}
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
            />
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.learningFieldMilestone')}</span>
          <input
            className={fieldClass}
            value={milestone}
            onChange={(e) => setMilestone(e.target.value)}
            placeholder={t('personal.learningMilestonePlaceholder')}
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
