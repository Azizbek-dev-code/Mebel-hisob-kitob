import { formatCountBadge } from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { HubLinkList, type HubLinkItem } from '@/features/personal/components/HubLinkList';
import { ROUTES } from '@/routes/paths';

import { useGrowthHabits } from '../hooks/use-growth-habits';
import { useGrowthQuotas } from '../hooks/use-growth-premium';

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
  const dueBadge = formatCountBadge(habits.data?.dueTodayCount ?? 0);

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

      <HubLinkList
        items={GROWTH_LINKS.map((item) =>
          item.to === ROUTES.personalGrowthHabits ? { ...item, badge: dueBadge } : item,
        )}
      />
    </div>
  );
}
