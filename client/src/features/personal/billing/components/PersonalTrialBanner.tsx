import { SubscriptionStatus, isPersonalAuth } from '@furniture-erp/shared';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

export function PersonalTrialBanner() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  if (!user || !isPersonalAuth(user)) return null;
  const sub = user.subscription;

  if (sub.status === SubscriptionStatus.TRIAL && sub.canWrite) {
    const days = sub.daysRemaining ?? 0;
    const warning = days <= 3;
    return (
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5',
          warning
            ? 'border-warning-100 bg-warning-50 text-warning-700'
            : 'border-brand-100 bg-brand-50 text-brand-800',
        )}
      >
        <p className="min-w-0 flex-1 text-sm font-medium">
          {days <= 0 ? t('personal.trialEndsToday') : t('personal.trialDays', { count: days })}
        </p>
        {warning ? (
          <Link
            to={ROUTES.personalBilling}
            className="inline-flex min-h-10 shrink-0 items-center text-sm font-medium underline-offset-2 hover:underline"
          >
            {t('personal.choosePlan')}
          </Link>
        ) : null}
      </div>
    );
  }

  if (!sub.canWrite) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
        <p className="min-w-0 flex-1 text-sm font-medium text-ink">{t('personal.trialEnded')}</p>
        <Link
          to={ROUTES.personalBilling}
          className="inline-flex min-h-10 shrink-0 items-center rounded-input bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"
        >
          {t('personal.choosePlan')}
        </Link>
      </div>
    );
  }

  return null;
}
