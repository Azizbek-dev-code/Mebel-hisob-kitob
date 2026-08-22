import { SubscriptionStatus, UserRole, planAllowsFeature } from '@furniture-erp/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authQueryKeys, useCurrentUser } from '@/features/auth/hooks/use-auth';
import { storeBillingService } from '@/services/store-billing.service';

import { SubscriptionGate } from './SubscriptionGate';
import { TrialWelcomeModal } from './TrialWelcomeModal';
import {
  SubscriptionContext,
  type SubscriptionGateReason,
} from './subscription-context';

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [gateOpen, setGateOpen] = useState(false);
  const [gateReason, setGateReason] = useState<SubscriptionGateReason>('expired');
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const isPlatformAdmin = user?.role === UserRole.PLATFORM_ADMIN;
  const canWrite = Boolean(isPlatformAdmin || !user?.subscription || user.subscription.canWrite);
  const isExpired = Boolean(!isPlatformAdmin && user?.subscription && !user.subscription.canWrite);
  const isTrial = user?.subscription?.status === SubscriptionStatus.TRIAL;
  const featureKeys = useMemo(
    () => user?.subscription?.featureKeys ?? [],
    [user?.subscription?.featureKeys],
  );
  const featuresRestricted = Boolean(user?.subscription?.featuresRestricted);

  const showWelcome =
    Boolean(user) &&
    !isPlatformAdmin &&
    isTrial &&
    !user?.subscription?.trialWelcomeSeenAt &&
    !welcomeDismissed;

  const openGate = useCallback((reason: SubscriptionGateReason = 'expired') => {
    setGateReason(reason);
    setGateOpen(true);
  }, []);

  const hasFeature = useCallback(
    (key: string) => {
      if (isPlatformAdmin) return true;
      return planAllowsFeature(featureKeys, key, featuresRestricted);
    },
    [featureKeys, featuresRestricted, isPlatformAdmin],
  );

  useEffect(() => {
    function onRequired() {
      openGate('expired');
    }
    function onFeature() {
      openGate('feature');
    }
    window.addEventListener('furniture-erp:subscription-required', onRequired);
    window.addEventListener('furniture-erp:feature-not-included', onFeature);
    return () => {
      window.removeEventListener('furniture-erp:subscription-required', onRequired);
      window.removeEventListener('furniture-erp:feature-not-included', onFeature);
    };
  }, [openGate]);

  async function onStartWelcome() {
    setWelcomeDismissed(true);
    try {
      await storeBillingService.markTrialWelcomeSeen();
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser });
    } catch {
      // Modal already closed; the next login can show it again if the write failed.
    }
  }

  const value = useMemo(
    () => ({
      canWrite,
      isExpired,
      isTrial,
      isPlatformAdmin,
      featureKeys,
      featuresRestricted,
      hasFeature,
      openGate,
    }),
    [
      canWrite,
      isExpired,
      isTrial,
      isPlatformAdmin,
      featureKeys,
      featuresRestricted,
      hasFeature,
      openGate,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      <SubscriptionGate open={gateOpen} reason={gateReason} onClose={() => setGateOpen(false)} />
      <TrialWelcomeModal
        open={showWelcome}
        trialEndsAt={user?.subscription?.trialEndsAt ?? null}
        onStart={() => void onStartWelcome()}
      />
    </SubscriptionContext.Provider>
  );
}
