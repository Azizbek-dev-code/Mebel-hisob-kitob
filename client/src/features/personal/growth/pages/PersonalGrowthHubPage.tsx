import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { HubLinkList, type HubLinkItem } from '@/features/personal/components/HubLinkList';
import { ROUTES } from '@/routes/paths';

import { useGrowthQuotas } from '../hooks/use-growth-premium';

const GROWTH_LINKS: readonly HubLinkItem[] = [
  {
    to: ROUTES.personalGrowthLearning,
    labelKey: 'personal.growth.learning',
    hintKey: 'personal.growth.learningHint',
  },
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
    to: '#growth-goals',
    labelKey: 'personal.growth.goals',
    hintKey: 'personal.growth.goalsHint',
    comingSoon: true,
  },
  {
    to: ROUTES.personalGrowthLevel,
    labelKey: 'personal.growth.level',
    hintKey: 'personal.growth.levelHint',
  },
  {
    to: ROUTES.personalGrowthAchievements,
    labelKey: 'personal.growth.achievements',
    hintKey: 'personal.growth.achievementsHint',
  },
  {
    to: ROUTES.personalGrowthFriends,
    labelKey: 'personal.growth.friends',
    hintKey: 'personal.growth.friendsHint',
  },
  {
    to: ROUTES.personalGrowthChallenges,
    labelKey: 'personal.growth.challenge',
    hintKey: 'personal.growth.challengeHint',
  },
  {
    to: ROUTES.personalGrowthSocial,
    labelKey: 'personal.growth.social',
    hintKey: 'personal.growth.socialHint',
  },
  {
    to: ROUTES.personalGrowthNotifications,
    labelKey: 'personal.growth.notifications',
    hintKey: 'personal.growth.notificationsHint',
  },
  {
    to: ROUTES.personalGrowthReviews,
    labelKey: 'personal.growth.reviews',
    hintKey: 'personal.growth.reviewsHint',
  },
];

export function PersonalGrowthHubPage() {
  const { t } = useTranslation();
  const quotas = useGrowthQuotas();

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.growthTitle')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.growthHint')}</p>
      </div>

      {quotas.data && !quotas.data.premium ? (
        <p className="rounded-2xl border border-line bg-surface px-3.5 py-3 text-sm text-ink-muted">
          {t('personal.growthPremiumSoftHint')}{' '}
          <Link to={ROUTES.personalBilling} className="font-medium text-brand-700 hover:underline">
            {t('personal.growthPremiumSoftCta')}
          </Link>
        </p>
      ) : null}

      <HubLinkList items={GROWTH_LINKS} />
    </div>
  );
}
