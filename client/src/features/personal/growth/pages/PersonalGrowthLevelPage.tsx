import { GrowthXpSource } from '@furniture-erp/shared';
import { Flame, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/routes/paths';

import { useGrowthProgress } from '../hooks/use-growth-xp';

const SOURCE_LABEL: Record<string, string> = {
  [GrowthXpSource.TODO_COMPLETED]: 'personal.xpSource.TODO_COMPLETED',
  [GrowthXpSource.HABIT_CHECK_IN]: 'personal.xpSource.HABIT_CHECK_IN',
  [GrowthXpSource.FOCUS_COMPLETED]: 'personal.xpSource.FOCUS_COMPLETED',
  [GrowthXpSource.LEARNING_SESSION]: 'personal.xpSource.LEARNING_SESSION',
  [GrowthXpSource.DAILY_GOAL_DONE]: 'personal.xpSource.DAILY_GOAL_DONE',
  [GrowthXpSource.MILESTONE_REACHED]: 'personal.xpSource.MILESTONE_REACHED',
  [GrowthXpSource.ACHIEVEMENT_UNLOCKED]: 'personal.xpSource.ACHIEVEMENT_UNLOCKED',
  [GrowthXpSource.FINANCE_DISCIPLINE]: 'personal.xpSource.FINANCE_DISCIPLINE',
};

export function PersonalGrowthLevelPage() {
  const { t } = useTranslation();
  const progress = useGrowthProgress();

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <p className="text-xs font-medium text-brand-700">
          <Link to={ROUTES.personalGrowth} className="hover:underline">
            {t('personal.navGrowth')}
          </Link>
        </p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink">
          {t('personal.levelTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.levelHint')}</p>
      </div>

      {progress.isPending && !progress.data ? (
        <Skeleton className="h-40 w-full" />
      ) : progress.isError ? (
        <ErrorState
          title={t('personal.levelLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void progress.refetch()}
        />
      ) : progress.data ? (
        <>
          <section className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-ink-muted">{t('personal.levelLabel')}</p>
                <p className="text-2xl font-semibold tabular-nums text-ink">
                  {progress.data.level}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-muted">{t('personal.levelTotalXp')}</p>
                <p className="text-sm font-semibold tabular-nums text-ink">
                  {progress.data.totalXp}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-ink-muted">
                <span>
                  {t('personal.levelXpInto', {
                    into: progress.data.xpIntoLevel,
                    next: progress.data.xpForNextLevel,
                  })}
                </span>
                <span>{progress.data.percent}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${progress.data.percent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                {t('personal.levelNext', { level: progress.data.level + 1 })}
                {' · '}
                {t('personal.levelRemaining', {
                  count: Math.max(0, progress.data.xpForNextLevel - progress.data.xpIntoLevel),
                })}
              </p>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-line bg-surface px-3 py-3">
              <div className="flex items-center gap-1.5 text-[10px] text-ink-muted">
                <Flame className="size-3.5 text-brand-700" aria-hidden="true" />
                {t('personal.homeStreak')}
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                {progress.data.currentStreak}
              </p>
              <p className="text-[11px] text-ink-muted">
                {t('personal.levelBestStreak', { count: progress.data.bestStreak })}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface px-3 py-3">
              <p className="text-[10px] text-ink-muted">{t('personal.levelTodayXp')}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                +{progress.data.todayXp}
              </p>
              <p className="text-[11px] text-ink-muted">{t('personal.levelDailyCap')}</p>
            </div>
          </div>

          <section>
            <h2 className="text-sm font-semibold text-ink">{t('personal.levelRecent')}</h2>
            {progress.data.recentEvents.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">{t('personal.levelRecentEmpty')}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {progress.data.recentEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {event.summary ??
                          t(SOURCE_LABEL[event.source] ?? 'personal.xpSource.OTHER')}
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        {t(SOURCE_LABEL[event.source] ?? 'personal.xpSource.OTHER')}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-brand-800">
                      +{event.amount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
