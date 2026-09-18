import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalFinanceHubPage } from './PersonalFinanceHubPage';

const PERSONAL: PersonalAuthUser = {
  kind: 'PERSONAL',
  id: 'idn_1',
  email: 'aziz@example.com',
  username: null,
  fullName: 'Aziz',
  phone: null,
  role: 'PERSONAL',
  responsibilities: [],
  storeId: null,
  storeName: 'Shaxsiy',
  workspaceId: 'ws_1',
  identityId: 'idn_1',
  membershipRole: 'OWNER',
  subscription: {
    status: 'TRIAL',
    storedStatus: 'TRIAL',
    planId: 'PERSONAL_TRIAL',
    planName: 'Sinov',
    trialEndsAt: '2026-09-20T00:00:00.000Z',
    currentPeriodEnd: '2026-09-20T00:00:00.000Z',
    trialWelcomeSeenAt: null,
    daysRemaining: 7,
    canWrite: true,
    hasPendingPaymentRequest: false,
    featureKeys: [],
    featuresRestricted: false,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PersonalFinanceHubPage', () => {
  it('links into existing ledger modules from the finance hub', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/summary': {
        status: 200,
        body: {
          success: true,
          data: {
            totalBalanceSom: 100000,
            monthIncomeSom: 50000,
            monthExpenseSom: 20000,
            monthNetSom: 30000,
            wallets: [],
            recentActivity: [],
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalFinanceHubPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Moliya' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tarix/ })).toHaveAttribute('href', '/personal/history');
    expect(screen.getByRole('link', { name: /Hisoblar/ })).toHaveAttribute('href', '/personal/accounts');
    expect(screen.getByRole('link', { name: /Budjet/ })).toHaveAttribute('href', '/personal/budgets');
    expect(screen.getByRole('link', { name: /Maqsadlar/ })).toHaveAttribute('href', '/personal/goals');
    expect(screen.getByText(/Intizom uchun tekis XP/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Level va XP/ })).toHaveAttribute(
      'href',
      '/personal/growth/level',
    );
  });
});
