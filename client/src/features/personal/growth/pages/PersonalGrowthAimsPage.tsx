import { GrowthAimStatus, type GrowthAimDto } from '@furniture-erp/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import { useCreateGrowthAim, useGrowthAims, useUpdateGrowthAim } from '../hooks/use-growth-aims';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-500';

export function PersonalGrowthAimsPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user?.subscription?.canWrite);
  const list = useGrowthAims();
  const createAim = useCreateGrowthAim();
  const updateAim = useUpdateGrowthAim();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const items = list.data?.items ?? [];

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createAim.mutateAsync({ title, note: note.trim() || null });
      setTitle('');
      setNote('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  async function onComplete(item: GrowthAimDto) {
    setError(null);
    try {
      await updateAim.mutateAsync({
        id: item.id,
        body: { status: GrowthAimStatus.COMPLETED },
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.growth.goals')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.growth.goalsHint')}</p>
        <Link to={ROUTES.personalGoals} className="mt-2 inline-block text-sm text-brand-700 hover:underline">
          {t('personal.goals')}
        </Link>
      </div>

      {error ? <p className="text-sm text-danger-700">{error}</p> : null}

      {list.isPending && !list.data ? (
        <Skeleton className="h-24 w-full" />
      ) : list.isError ? (
        <ErrorState title={t('personal.ledgerLoadFailed')} message={t('common.retry')} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('personal.growth.goalsEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <p className={cn('text-sm font-medium text-ink', item.status === GrowthAimStatus.COMPLETED && 'line-through')}>
                  {item.title}
                </p>
                {item.note ? <p className="mt-0.5 text-xs text-ink-muted">{item.note}</p> : null}
              </div>
              {canWrite && item.status !== GrowthAimStatus.COMPLETED ? (
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-brand-700"
                  onClick={() => void onComplete(item)}
                >
                  {t('common.done', { defaultValue: 'Bajarildi' })}
                </button>
              ) : (
                <span className="shrink-0 text-xs text-ink-muted">{t('status.sale.COMPLETED')}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite ? (
        <form onSubmit={onCreate} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink">{t('personal.growth.addGoal')}</h2>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('personal.growth.goalTitle')}
            className={fieldClass}
            required
            minLength={2}
          />
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('personal.note')}
            className={fieldClass}
            rows={3}
          />
          <button
            type="submit"
            disabled={createAim.isPending}
            className="w-full rounded-input bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {t('common.save')}
          </button>
        </form>
      ) : null}
    </div>
  );
}
