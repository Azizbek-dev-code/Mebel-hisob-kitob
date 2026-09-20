import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import { ROUTES } from '@/routes/paths';

const PROFILE_NESTED = new Set<string>([
  ROUTES.personalBilling,
  ROUTES.personalReferral,
  ROUTES.personalNotifications,
  ROUTES.personalCategories,
  ROUTES.personalRecurring,
  ROUTES.personalGrowthFriends,
  ROUTES.personalGrowthChallenges,
  ROUTES.personalGrowthSocial,
  ROUTES.personalProfileEdit,
  ROUTES.personalSecurity,
  ROUTES.personalFeedback,
]);

const ROOT = new Set<string>([
  ROUTES.personalDashboard,
  ROUTES.personalPlan,
  ROUTES.personalGrowth,
  ROUTES.personalFinance,
  ROUTES.personalProfile,
  ROUTES.personalRanking,
]);

export function personalBackTarget(pathname: string): { to: string; labelKey: string } | null {
  if (ROOT.has(pathname)) return null;
  if (PROFILE_NESTED.has(pathname)) {
    return { to: ROUTES.personalProfile, labelKey: 'personal.navProfile' };
  }
  if (pathname.startsWith(`${ROUTES.personalRanking}/`)) {
    return { to: ROUTES.personalRanking, labelKey: 'personal.navRanking' };
  }
  if (pathname.startsWith(`${ROUTES.personalGrowth}/`)) {
    return { to: ROUTES.personalGrowth, labelKey: 'personal.navGrowth' };
  }
  if (pathname.startsWith('/personal/')) {
    return { to: ROUTES.personalFinance, labelKey: 'personal.navFinance' };
  }
  return null;
}

export function PersonalBackBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const target = personalBackTarget(pathname);
  if (!target) return null;

  return (
    <Link
      to={target.to}
      className="mb-1 inline-flex max-w-full items-center gap-0.5 rounded-input py-1 pr-2 text-sm font-semibold text-ink hover:bg-surface-hover"
      aria-label={`${t('common.back', { defaultValue: 'Orqaga' })}: ${t(target.labelKey)}`}
    >
      <ChevronLeft className="size-5 shrink-0" aria-hidden="true" />
      <span className="truncate">{t(target.labelKey)}</span>
    </Link>
  );
}
