import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/routes/paths';

import { hubForPath } from './hubs';

describe('hubForPath', () => {
  it('maps account surfaces to the accounts hub', () => {
    expect(hubForPath(ROUTES.platformAccounts)?.ariaLabelKey).toBe('platformAdmin.hub.accountsAria');
    expect(hubForPath(ROUTES.platformStoreRequests)?.ariaLabelKey).toBe(
      'platformAdmin.hub.accountsAria',
    );
    expect(hubForPath(ROUTES.platformStoreRequestDetail('req_1'))?.ariaLabelKey).toBe(
      'platformAdmin.hub.accountsAria',
    );
    expect(hubForPath(ROUTES.platformShopsActive)?.ariaLabelKey).toBe('platformAdmin.hub.accountsAria');
    expect(hubForPath(ROUTES.platformPersonal)?.ariaLabelKey).toBe('platformAdmin.hub.accountsAria');
    expect(hubForPath(ROUTES.platformAccountDetail('ws_1'))?.ariaLabelKey).toBe(
      'platformAdmin.hub.accountsAria',
    );
  });

  it('maps billing surfaces to the subscriptions hub', () => {
    expect(hubForPath(ROUTES.platformSubscriptions)?.ariaLabelKey).toBe(
      'platformAdmin.hub.subscriptionsAria',
    );
    expect(hubForPath(ROUTES.platformPaymentsOverdue)?.ariaLabelKey).toBe(
      'platformAdmin.hub.subscriptionsAria',
    );
    expect(hubForPath(ROUTES.platformPlans)?.ariaLabelKey).toBe('platformAdmin.hub.subscriptionsAria');
  });

  it('maps finance surfaces to the finance hub', () => {
    expect(hubForPath(ROUTES.platformFinance)?.ariaLabelKey).toBe('platformAdmin.hub.financeAria');
    expect(hubForPath(ROUTES.platformAnalyticsProfit)?.ariaLabelKey).toBe(
      'platformAdmin.hub.financeAria',
    );
  });

  it('nests deletion reasons under settings', () => {
    expect(hubForPath(ROUTES.platformSettings)?.ariaLabelKey).toBe('platformAdmin.hub.settingsAria');
    expect(hubForPath(ROUTES.platformAccountDeletions)?.ariaLabelKey).toBe(
      'platformAdmin.hub.settingsAria',
    );
  });

  it('maps onboarding surfaces to the onboarding hub', () => {
    expect(hubForPath(ROUTES.platformOnboarding)?.ariaLabelKey).toBe(
      'platformAdmin.hub.onboardingAria',
    );
    expect(hubForPath(ROUTES.platformOnboardingQuestions)?.ariaLabelKey).toBe(
      'platformAdmin.hub.onboardingAria',
    );
  });

  it('maps referral surfaces to the referral hub', () => {
    expect(hubForPath(ROUTES.platformReferral)?.ariaLabelKey).toBe(
      'platformAdmin.hub.referralAria',
    );
    expect(hubForPath(ROUTES.platformReferralUsers)?.ariaLabelKey).toBe(
      'platformAdmin.hub.referralAria',
    );
  });

  it('leaves the dashboard without hub tabs', () => {
    expect(hubForPath(ROUTES.dashboard)).toBeUndefined();
  });
});
