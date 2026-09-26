import { formatCountBadge } from '@furniture-erp/shared';
import { Flame, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Skeleton } from '@/components/ui/Skeleton';
import { HubLinkList, type HubLinkItem } from '@/features/personal/components/HubLinkList';
import { ROUTES } from '@/routes/paths';

import { useGrowthHabits } from '../hooks/use-growth-habits';
import { useGrowthQuotas } from '../hooks/use-growth-premium';
import { useGrowthProgress } from '../hooks/use-growth-xp';

const GROWTH_LINKS: readonly HubLinkItem[] = [
  {
    to: ROUTES.personalGrowthTodos,
    labelKey: 'personal.growth.todo',
    hintKey: 'personal.growth.todoHint',
  },
  {
    to: ROUTES.personalGrowthHabits,
    labelKey: 'personal.growth.habits',
    hintKey: 'personal.growth.habitsHint',
  },
  {
    to: ROUTES.personalGrowthFocus,
    labelKey: 'personal.growth.focus',
    hintKey: 'personal.growth.focusHint',
  },
  {
    to: ROUTES.personalGrowthLevel,
    labelKey: 'personal.growth.level',
    hintKey: 'personal.growth.levelHint',
  },
  {
    to: ROUTES.personalRanking,
    labelKey: 'personal.rankingTitle',
    hintKey: 'personal.rankingHint',
  },
  {
    to: ROUTES.personalGrowthAchievements,
    labelKey: 'personal.growth.achievements',
    hintKey: 'personal.growth.achievementsHint',
  },
  {
    to: ROUTES.personalGrowthChallenges,
    labelKey: 'personal.growth.challenge',
    hintKey: 'personal.growth.challengeHint',
  },
];

export function PersonalGrowthHubPage() {
  const { t } = useTranslation();
  const quotas = useGrowthQuotas();
  const habits = useGrowthHabits();
  const progress = useGrowthProgress();
  const dueBadge = formatCountBadge(habits.data?.dueTodayCount ?? 0);

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <h1 className="pf-page-title">{t('personal.growthTitle')}</h1>
        <p className="pf-page-hint">{t('personal.growthHint')}</p>
      </div>

      {progress.isPending && !progress.data ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : progress.data ? (
        <Link to={ROUTES.personalGrowthLevel} className="pf-card block p-4 transition-colors hover:bg-surface-hover">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-muted">{t('personal.levelLabel')}</p>
              <p className="text-xl font-semibold tabular-nums text-ink">{progress.data.level}</p>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1 text-xs text-ink-muted">
                <Flame className="size-3.5 text-warning-500" aria-hidden="true" />
                {progress.data.currentStreak}
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-success-600">
                +{progress.data.todayXp} XP
              </p>
              {progress.data.globalRank != null && progress.data.globalRank > 0 ? (
                <p className="mt-0.5 text-[11px] tabular-nums text-ink-muted">
                  #{progress.data.globalRank}
                </p>
              ) : null}
            </div>
          </div>
          <div className="pf-progress-track mt-3">
            <div className="pf-progress-fill" style={{ width: `${progress.data.percent}%` }} />
          </div>
        </Link>
      ) : null}

      {quotas.data && !quotas.data.premium ? (
        <p className="px-1 text-sm text-ink-muted">
          {t('personal.growthPremiumSoftHint')}{' '}
          <Link to={ROUTES.personalBilling} className="font-semibold text-brand-600 hover:underline">
            {t('personal.growthPremiumSoftCta')}
          </Link>
        </p>
      ) : null}

      <HubLinkList
        items={GROWTH_LINKS.map((item) =>
          item.to === ROUTES.personalGrowthHabits ? { ...item, badge: dueBadge } : item,
        )}
      />
    </div>
  );
}
