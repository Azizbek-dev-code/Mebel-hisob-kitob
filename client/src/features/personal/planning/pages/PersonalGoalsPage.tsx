import { PersonalSavingGoalStatus, formatMoney } from '@furniture-erp/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { todayInputDate } from '@/features/expenses/utils/date';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { ApiClientError } from '@/lib/api-client';
import { formatDate } from '@/utils/format';

import {
  useContributePersonalGoal,
  useCreatePersonalSavingGoal,
  usePersonalSavingGoals,
  useUpdatePersonalSavingGoal,
} from '../hooks/use-personal-planning';
import { ProgressBar } from '../components/ProgressBar';
import { GoalEtaText } from '../components/GoalEtaText';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500';

export function PersonalGoalsPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user?.subscription?.canWrite);
  const goals = usePersonalSavingGoals();
  const createGoal = useCreatePersonalSavingGoal();
  const updateGoal = useUpdatePersonalSavingGoal();
  const contribute = useContributePersonalGoal();
  const [name, setName] = useState('');
  const [target, setTarget] = useState(0);
  const [monthly, setMonthly] = useState(0);
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [occurredAt, setOccurredAt] = useState(todayInputDate);
  const [note, setNote] = useState('');
  const [selectedId, setSelectedId] = useState('');

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createGoal.mutateAsync({
        name,
        targetSom: target,
        targetDate: targetDate || null,
        monthlyContributionSom: monthly > 0 ? monthly : null,
      });
      setName('');
      setTarget(0);
      setMonthly(0);
      setTargetDate('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  async function onContribute(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const goalId = selectedId || goals.data?.items.find((item) => item.status === PersonalSavingGoalStatus.ACTIVE)?.id;
    if (!goalId) return;
    try {
      await contribute.mutateAsync({
        id: goalId,
        body: { amount, occurredAt, note: note.trim() || null },
      });
      setAmount(0);
      setNote('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  const activeGoals = (goals.data?.items ?? []).filter(
    (item) => item.status === PersonalSavingGoalStatus.ACTIVE,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.goals')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.goalsHint')}</p>
      </div>

      {goals.isPending && !goals.data ? (
        <Skeleton className="h-32 w-full" />
      ) : goals.isError ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void goals.refetch()}
        />
      ) : (goals.data?.items.length ?? 0) === 0 ? (
        <p className="text-sm text-ink-muted">{t('personal.noGoals')}</p>
      ) : (
        <ul className="space-y-3">
          {goals.data?.items.map((goal) => (
            <li
              key={goal.id}
              className="space-y-2 rounded-panel border border-line bg-surface px-4 py-3 text-sm shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{goal.name}</p>
                  <p className="text-xs text-ink-muted">
                    {formatMoney(goal.savedSom)} / {formatMoney(goal.targetSom)}
                    {` · ${t('personal.goalRemaining')}: ${formatMoney(Math.max(0, goal.targetSom - goal.savedSom))}`}
                    {` · ${goal.percent}%`}
                    {goal.targetDate ? ` · ${t('personal.goalBy')} ${formatDate(goal.targetDate)}` : ''}
                  </p>
                  <div className="mt-1">
                    <GoalEtaText goal={goal} />
                  </div>
                </div>
                {canWrite && goal.status === PersonalSavingGoalStatus.ACTIVE ? (
                  <button
                    type="button"
                    className="text-xs text-danger-700 hover:underline"
                    onClick={() =>
                      updateGoal.mutate({
                        id: goal.id,
                        body: { status: PersonalSavingGoalStatus.CANCELLED },
                      })
                    }
                  >
                    {t('common.cancel')}
                  </button>
                ) : (
                  <span className="text-xs text-ink-muted">{t(`personal.goalStatus.${goal.status}`)}</span>
                )}
              </div>
              <ProgressBar percent={goal.percent} over={false} />
              {goal.contributions.length > 0 ? (
                <ul className="space-y-1 border-t border-line pt-2">
                  {goal.contributions.slice(0, 5).map((item) => (
                    <li key={item.id} className="flex justify-between text-xs text-ink-muted">
                      <span>{formatDate(item.occurredAt)}</span>
                      <span>{formatMoney(item.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canWrite ? (
        <>
          {activeGoals.length > 0 ? (
            <form
              onSubmit={onContribute}
              className="space-y-3 rounded-panel border border-line bg-surface p-4 shadow-card"
            >
              <h2 className="text-sm font-semibold text-ink">{t('personal.addContribution')}</h2>
              <p className="text-xs text-ink-muted">{t('personal.goalContributeHint')}</p>
              {error ? <p className="text-sm text-danger-700">{error}</p> : null}
              <select
                value={selectedId || activeGoals[0]?.id || ''}
                onChange={(event) => setSelectedId(event.target.value)}
                className={fieldClass}
              >
                {activeGoals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name}
                  </option>
                ))}
              </select>
              <MoneyField label={t('common.amount')} value={amount} onChange={setAmount} />
              <input
                type="date"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                className={fieldClass}
              />
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t('personal.note')}
                className={fieldClass}
              />
              <button
                type="submit"
                disabled={contribute.isPending}
                className="rounded-input bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {t('common.save')}
              </button>
            </form>
          ) : null}

          <form onSubmit={onCreate} className="space-y-3 rounded-panel border border-line bg-surface p-4 shadow-card">
            <h2 className="text-sm font-semibold text-ink">{t('personal.addGoal')}</h2>
            {error && activeGoals.length === 0 ? <p className="text-sm text-danger-700">{error}</p> : null}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('personal.goalName')}
              className={fieldClass}
            />
            <MoneyField label={t('personal.goalTarget')} value={target} onChange={setTarget} />
            <MoneyField label={t('personal.goalMonthly')} value={monthly} onChange={setMonthly} />
            <label className="block text-sm font-medium text-ink">
              {t('personal.goalBy')}
              <input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                className={`${fieldClass} mt-1.5`}
              />
            </label>
            <button
              type="submit"
              disabled={createGoal.isPending}
              className="rounded-input bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {t('common.save')}
            </button>
          </form>
        </>
      ) : (
        <p className="text-sm text-danger-700">{t('personal.trialEnded')}</p>
      )}
    </div>
  );
}
