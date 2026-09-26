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
        <h1 className="pf-page-title mt-1">
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
          <section className="pf-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-ink-muted">{t('personal.levelLabel')}</p>
                <p className="text-2xl font-semibold tabular-nums text-ink">
                  {progress.data.level}
                </p>
                <p className="text-xs font-medium text-brand-700">
                  {t(`personal.levelTitleName.${progress.data.levelTitleKey ?? 'starter'}`)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-muted">{t('personal.levelTotalXp')}</p>
                <p className="text-sm font-semibold tabular-nums text-ink">
                  {progress.data.totalXp}
                </p>
                {progress.data.globalRank != null && progress.data.globalRank > 0 ? (
                  <p className="mt-1 text-xs tabular-nums text-ink-muted">
                    #{progress.data.globalRank}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-ink-muted">
                <span className="tabular-nums">
                  {progress.data.xpIntoLevel} / {progress.data.xpForNextLevel} XP
                </span>
                <span>{progress.data.percent}%</span>
              </div>
              <div className="pf-progress-track mt-1.5">
                <div
                  className="pf-progress-fill"
                  style={{ width: `${progress.data.percent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                {t('personal.levelRemaining', {
                  count: Math.max(0, progress.data.xpForNextLevel - progress.data.xpIntoLevel),
                })}
                {' · '}
                {t('personal.levelNext', { level: progress.data.level + 1 })}
              </p>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="pf-card px-3 py-3">
              <div className="flex items-center gap-1.5 text-[10px] text-ink-muted">
                <Flame className="size-3.5 text-warning-500" aria-hidden="true" />
                {t('personal.homeStreak')}
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                {progress.data.currentStreak}
              </p>
              <p className="text-[11px] text-ink-muted">
                {t('personal.levelBestStreak', { count: progress.data.bestStreak })}
              </p>
            </div>
            <div className="pf-card px-3 py-3">
              <p className="text-[10px] text-ink-muted">{t('personal.levelTodayXp')}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-success-600">
                +{progress.data.todayXp}
              </p>
              <p className="text-[11px] text-ink-muted">{t('personal.levelDailyCap')}</p>
            </div>
          </div>

          <section className="pf-card p-4">
            <h2 className="pf-section-title">{t('personal.levelUnlocksTitle')}</h2>
            {(progress.data.unlockedKeys?.length ?? 0) > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {progress.data.unlockedKeys.map((key) => (
                  <li key={key} className="text-sm text-ink">
                    ✓ {t(`personal.levelUnlock.${key === 'ACHIEVEMENT_BADGE' ? 'achievementBadge' : key === 'PROFILE_BADGE' ? 'profileBadge' : key === 'CUSTOMIZATION' ? 'customization' : key === 'SPECIAL_CHALLENGE' ? 'specialChallenge' : key === 'RANKING_BADGE' ? 'rankingBadge' : key === 'PROFILE_STATUS' ? 'profileStatus' : 'eliteStatus'}`)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">{t('personal.levelUnlocksEmpty')}</p>
            )}
            {progress.data.nextUnlock ? (
              <div className="mt-3 border-t border-line/70 pt-3">
                <p className="text-xs font-medium text-ink-muted">{t('personal.levelNextUnlock')}</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  🔒 Level {progress.data.nextUnlock.minLevel}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {t(`personal.levelUnlock.${progress.data.nextUnlock.titleKey}`)}
                </p>
              </div>
            ) : null}
            <Link to={ROUTES.personalGrowthTodos} className="pf-btn-primary mt-4 inline-flex w-full">
              {t('personal.levelContinueCta')}
            </Link>
          </section>

          {progress.data.globalRank != null || progress.data.xpToTop3 != null ? (
            <section className="pf-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="pf-section-title">{t('personal.rankingTitle')}</h2>
                <Link to={ROUTES.personalRanking} className="text-xs font-semibold text-brand-600 hover:underline">
                  {t('personal.rankingOpen')}
                </Link>
              </div>
              {progress.data.globalRank != null && progress.data.globalRank > 0 ? (
                <p className="mt-2 text-sm tabular-nums text-ink">
                  #{progress.data.globalRank}
                </p>
              ) : null}
              {progress.data.xpToTop3 != null && progress.data.xpToTop3 > 0 ? (
                <p className="mt-1 text-xs text-ink-muted">
                  {t('personal.rankingXpToTop3', { count: progress.data.xpToTop3 })}
                </p>
              ) : null}
            </section>
          ) : null}

          <section>
            <h2 className="pf-section-title">{t('personal.levelRecent')}</h2>
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
