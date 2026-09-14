import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_PLATFORM_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PlatformAccountsOverviewPage, PlatformSubscriptionsOverviewPage } from './PlatformHubPages';
import { PlatformReferralPage } from './PlatformReferralPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('platform hub pages', () => {
  it('summarises personal and business accounts from real APIs', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PLATFORM_ADMIN } } },
      '/platform/accounts': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [],
            summary: {
              total: 6,
              active: 4,
              trial: 1,
              pending: 5,
              expired: 0,
              blocked: 1,
              cancelled: 0,
            },
            businessTypes: ['FURNITURE'],
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <PlatformAccountsOverviewPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Jami akkauntlar')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.queryByText('Gilam')).not.toBeInTheDocument();
    expect(screen.queryByText('Kiyim')).not.toBeInTheDocument();
  });

  it('keeps personal and business subscription totals separate', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PLATFORM_ADMIN } } },
      '/platform/dashboard': {
        status: 200,
        body: {
          success: true,
          data: {
            totalStores: 4,
            activeStores: 3,
            blockedStores: 1,
            trialStores: 2,
            activeSubscriptions: 3,
            pendingPaymentStores: 1,
            expiredStores: 1,
            pendingStoreRequests: 0,
            pendingSubscriptionRequests: 2,
            pendingPayments: 1,
            pendingPaymentAmount: 0,
            overduePayments: 0,
            overduePaymentAmount: 0,
            subscriptionRevenueTotal: 200000,
            monthRevenue: 0,
            monthExpenses: 0,
            monthNetProfit: 0,
            otherRevenue: 0,
            personalWorkspaces: 2,
            personalActive: 1,
            personalTrial: 1,
            personalExpired: 0,
            pendingPersonalSubscriptionRequests: 1,
            pendingBusinessSubscriptionRequests: 2,
            pendingWithdrawals: 0,
            referralSignups: 0,
            accountGrowth: [],
            subscriptionByPlan: [],
            pnlSeries: [],
            storeSeries: [],
            latestPayments: [],
            latestStoreRequests: [],
            period: { from: '2026-09-01', to: '2026-09-30', label: 'Shu oy' },
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <PlatformSubscriptionsOverviewPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Biznes')).toBeInTheDocument();
    expect(screen.getByText('Shaxsiy')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByText('4')).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText(/Personal invoice yo‘q/)).toBeInTheDocument();
  });

  it('shows referral overview totals from the API', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PLATFORM_ADMIN } } },
      '/platform/referrals/overview': {
        status: 200,
        body: {
          success: true,
          data: {
            clicks: 12,
            registrations: 4,
            conversions: 1,
            commissions: 10000,
            pendingWithdrawals: 2,
            pendingWithdrawalAmount: 110000,
            paidWithdrawals: 0,
            paidWithdrawalAmount: 0,
            commissionPercent: 10,
            minWithdrawal: 100000,
            programActive: true,
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <PlatformReferralPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Bosishlar')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.queryByText('Referral yozuvi yo‘q')).not.toBeInTheDocument();
  });
});
