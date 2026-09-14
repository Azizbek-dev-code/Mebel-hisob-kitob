import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_PLATFORM_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PlatformDashboardPage } from './PlatformDashboardPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PlatformDashboardPage', () => {
  it('shows a compact platform overview without duplicating module cards', async () => {
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
            trialStores: 12,
            activeSubscriptions: 31,
            pendingPaymentStores: 4,
            expiredStores: 7,
            pendingStoreRequests: 3,
            pendingSubscriptionRequests: 2,
            pendingPayments: 2,
            pendingPaymentAmount: 400000,
            overduePayments: 1,
            overduePaymentAmount: 200000,
            monthRevenue: 200000,
            monthExpenses: 50000,
            monthNetProfit: 150000,
            otherRevenue: 0,
            personalWorkspaces: 2,
            personalActive: 1,
            personalTrial: 1,
            personalExpired: 0,
            pendingPersonalSubscriptionRequests: 0,
            pendingBusinessSubscriptionRequests: 2,
            pendingWithdrawals: 0,
            referralSignups: 0,
            accountGrowth: [],
            subscriptionByPlan: [],
            pnlSeries: [{ month: '2026-08', revenue: 200000, expenses: 50000, netProfit: 150000 }],
            storeSeries: [],
            latestPayments: [],
            latestStoreRequests: [],
            period: { from: '2026-08-16', to: '2026-09-14', label: '30 kun' },
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <PlatformDashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Kutilayotgan akkauntlar')).toBeInTheDocument();
    expect((await screen.findAllByText('3')).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Kutilayotgan akkauntlar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7 kun' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30 kun' })).toBeInTheDocument();
    expect(screen.queryByText('Platform Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Sotuvlar')).not.toBeInTheDocument();
    expect(screen.getByText('Tarkib')).toBeInTheDocument();
    expect(screen.getByText('Yechish so‘rovlari')).toBeInTheDocument();
  });
});
