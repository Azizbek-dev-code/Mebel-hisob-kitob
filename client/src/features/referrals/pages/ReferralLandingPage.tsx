import { homePathForAuth, isReferralCode, normalizeReferralCode } from '@furniture-erp/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { PageContainer } from '@/components/layout/PageContainer';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { referralsService } from '@/services/referrals.service';
import { ROUTES } from '@/routes/paths';

/**
 * Public `/ref/:code` landing.
 *
 * New visitors keep the cookie and continue to onboarding/registration.
 * Already-signed-in users must NOT be forced into “Yangi do‘kon ochish” —
 * they return to their current home; new accounts stay on AccountSwitcher.
 */
export function ReferralLandingPage() {
  const { t } = useTranslation();
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { data: user, isPending: authPending } = useCurrentUser();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authPending) return;

    const normalized = normalizeReferralCode(code);
    if (!isReferralCode(normalized)) {
      setError(t('referral.invalidLink'));
      return;
    }

    let cancelled = false;

    function goNext() {
      if (cancelled) return;
      if (user) {
        navigate(homePathForAuth(user), { replace: true });
        return;
      }
      navigate(ROUTES.onboarding, { replace: true });
    }

    void referralsService
      .click(normalized)
      .then(() => {
        goNext();
      })
      .catch(async () => {
        try {
          const resolved = await referralsService.resolve(normalized);
          if (cancelled) return;
          if (resolved.valid) {
            goNext();
            return;
          }
        } catch {
          /* public resolve failed the same way as click */
        }
        if (!cancelled) setError(t('referral.invalidLink'));
      });

    return () => {
      cancelled = true;
    };
  }, [authPending, code, navigate, t, user]);

  return (
    <PageContainer className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('referral.landingTitle')}</h1>
        <p className="mt-2 text-sm text-ink-muted">{error ?? t('referral.landingHint')}</p>
      </div>
    </PageContainer>
  );
}
