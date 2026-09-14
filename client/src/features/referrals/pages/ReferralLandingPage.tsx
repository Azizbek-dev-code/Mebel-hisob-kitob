import { isReferralCode, normalizeReferralCode } from '@furniture-erp/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { PageContainer } from '@/components/layout/PageContainer';
import { referralsService } from '@/services/referrals.service';
import { ROUTES } from '@/routes/paths';

export function ReferralLandingPage() {
  const { t } = useTranslation();
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const normalized = normalizeReferralCode(code);
    if (!isReferralCode(normalized)) {
      setError(t('referral.invalidLink'));
      return;
    }

    let cancelled = false;
    void referralsService
      .click(normalized)
      .then(() => {
        if (!cancelled) navigate(ROUTES.onboarding, { replace: true });
      })
      .catch(async () => {
        try {
          const resolved = await referralsService.resolve(normalized);
          if (cancelled) return;
          if (resolved.valid) {
            navigate(ROUTES.onboarding, { replace: true });
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
  }, [code, navigate, t]);

  return (
    <PageContainer className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold text-ink">{t('referral.landingTitle')}</h1>
        <p className="mt-2 text-sm text-ink-muted">{error ?? t('referral.landingHint')}</p>
      </div>
    </PageContainer>
  );
}
