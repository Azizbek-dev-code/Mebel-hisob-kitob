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
  it('shows billing KPIs and platform modules', async () => {
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
            pendingPayments: 2,
            pendingPaymentAmount: 400000,
            overduePayments: 1,
            overduePaymentAmount: 200000,
            monthRevenue: 200000,
            monthExpenses: 50000,
            monthNetProfit: 150000,
            pnlSeries: [{ month: '2026-08', revenue: 200000, expenses: 50000, netProfit: 150000 }],
            storeSeries: [{ month: '2026-08', submitted: 3, approved: 1, rejected: 0, active: 3, blocked: 1 }],
            latestPayments: [],
            latestStoreRequests: [],
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <PlatformDashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Kutilayotgan do'kon so'rovlari")).toBeInTheDocument();
    expect((await screen.findAllByText('3')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Do'kon so'rovlari/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Platform Settings/ })).toBeInTheDocument();
    expect(screen.queryByText('Sotuvlar')).not.toBeInTheDocument();
  });
});
