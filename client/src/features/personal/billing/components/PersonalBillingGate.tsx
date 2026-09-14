import { SubscriptionStatus, isPersonalAuth } from '@furniture-erp/shared';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ROUTES } from '@/routes/paths';

import { useMarkPersonalTrialWelcomeSeen } from '../hooks/use-personal-billing';
import { PersonalPaywallModal } from './PersonalPaywallModal';
import { PersonalTrialWelcomeModal } from './PersonalTrialWelcomeModal';

const SUBSCRIPTION_REQUIRED = 'furniture-erp:subscription-required';

export function PersonalBillingGate() {
  const { pathname } = useLocation();
  const { data: user } = useCurrentUser();
  const markWelcome = useMarkPersonalTrialWelcomeSeen();
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallDismissed, setPaywallDismissed] = useState(false);

  const personal = user && isPersonalAuth(user) ? user : null;
  const sub = personal?.subscription;
  const canWrite = Boolean(sub?.canWrite);
  const isTrial = sub?.status === SubscriptionStatus.TRIAL && canWrite;
  const isExpired = Boolean(personal && !canWrite);
  const onBilling = pathname === ROUTES.personalBilling;

  const showWelcome = Boolean(isTrial && !sub?.trialWelcomeSeenAt && !welcomeDismissed);

  useEffect(() => {
    if (canWrite) {
      setPaywallOpen(false);
      setPaywallDismissed(false);
      return;
    }
    if (isExpired && !paywallDismissed && !onBilling && !showWelcome) {
      setPaywallOpen(true);
    }
  }, [canWrite, isExpired, onBilling, paywallDismissed, showWelcome]);

  useEffect(() => {
    function onRequired() {
      if (!personal) return;
      setPaywallOpen(true);
    }
    window.addEventListener(SUBSCRIPTION_REQUIRED, onRequired);
    return () => window.removeEventListener(SUBSCRIPTION_REQUIRED, onRequired);
  }, [personal]);

  function dismissWelcome() {
    setWelcomeDismissed(true);
    void markWelcome.mutateAsync().catch(() => undefined);
  }

  function dismissPaywall() {
    setPaywallOpen(false);
    setPaywallDismissed(true);
  }

  return (
    <>
      <PersonalTrialWelcomeModal
        open={showWelcome}
        trialEndsAt={sub?.trialEndsAt ?? null}
        onStart={dismissWelcome}
      />
      <PersonalPaywallModal open={paywallOpen && !showWelcome} onClose={dismissPaywall} />
    </>
  );
}
