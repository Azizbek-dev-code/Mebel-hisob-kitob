import { createContext, useContext } from 'react';
import { planAllowsFeature } from '@furniture-erp/shared';

export type SubscriptionGateReason = 'expired' | 'feature';

export interface SubscriptionContextValue {
  canWrite: boolean;
  isExpired: boolean;
  isTrial: boolean;
  isPlatformAdmin: boolean;
  featureKeys: string[];
  featuresRestricted: boolean;
  hasFeature: (key: string) => boolean;
  openGate: (reason?: SubscriptionGateReason) => void;
}

export const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function useSubscription(): SubscriptionContextValue {
  const value = useContext(SubscriptionContext);
  if (!value) {
    return {
      canWrite: true,
      isExpired: false,
      isTrial: false,
      isPlatformAdmin: false,
      featureKeys: [],
      featuresRestricted: false,
      hasFeature: () => true,
      openGate: () => undefined,
    };
  }
  return value;
}

export function subscriptionAllowsFeature(
  featureKeys: string[] | undefined,
  featuresRestricted: boolean | undefined,
  key: string,
): boolean {
  return planAllowsFeature(featureKeys, key, featuresRestricted);
}
