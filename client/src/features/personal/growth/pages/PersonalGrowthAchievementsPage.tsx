import { Award, Lock } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import {
  useEvaluateGrowthAchievements,
  useGrowthAchievements,
} from '../hooks/use-growth-achievements';

export function PersonalGrowthAchievementsPage() {
  const { t } = useTranslation();
  const list = useGrowthAchievements();
  const evaluate = useEvaluateGrowthAchievements();

  useEffect(() => {
    void evaluate.mutateAsync().catch(() => undefined);
    // Evaluate once on open to catch learning/saving goals without XP events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data = evaluate.data ?? list.data;

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <p className="text-xs font-medium text-brand-700">
          <Link to={ROUTES.personalGrowth} className="hover:underline">
            {t('personal.navGrowth')}
          </Link>
        </p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink">
          {t('personal.achievementsTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.achievementsHint')}</p>
      </div>

      {data ? (
        <p className="text-xs text-ink-muted">
          {t('personal.achievementsStats', {
            unlocked: data.unlockedCount,
            total: data.totalCount,
          })}
        </p>
      ) : null}

      {(list.isPending || evaluate.isPending) && !data ? (
        <Skeleton className="h-48 w-full" />
      ) : list.isError && !data ? (
        <ErrorState
          title={t('personal.achievementsLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void list.refetch()}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-2.5">
          {data?.items.map((item) => (
            <li
              key={item.key}
              className={cn(
                'flex items-start gap-3 rounded-2xl border px-3 py-3',
                item.unlocked
                  ? 'border-brand-200 bg-brand-50/40'
                  : 'border-line bg-surface',
                item.comingSoon && 'opacity-70',
              )}
            >
              <div
                className={cn(
                  'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
                  item.unlocked
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-muted text-ink-subtle',
                )}
              >
                {item.unlocked ? (
                  <Award className="size-4" aria-hidden="true" />
                ) : (
                  <Lock className="size-4" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    {t(`personal.achievement.${item.titleKey}`)}
                  </p>
                  {item.rewardXp > 0 ? (
                    <span className="shrink-0 text-xs font-medium tabular-nums text-brand-800">
                      +{item.rewardXp} XP
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {item.comingSoon
                    ? t('personal.achievementsComingSoon')
                    : t(`personal.achievement.${item.hintKey}`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
