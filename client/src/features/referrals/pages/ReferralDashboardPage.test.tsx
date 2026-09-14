import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { ReferralDashboardPage } from './ReferralDashboardPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ReferralDashboardPage', () => {
  it('shows the referral link, stats and withdraw gate', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
      '/referrals/me': {
        status: 200,
        body: {
          success: true,
          data: {
            code: 'ABX7K29Q',
            path: '/ref/ABX7K29Q',
            programActive: true,
            commissionPercent: 10,
            minWithdrawal: 100000,
            clicks: 8,
            registrations: 2,
            firstPayments: 1,
            conversionPercent: 50,
            earned: 10000,
            available: 10000,
            pending: 0,
            paid: 0,
            canWithdraw: false,
          },
        },
      },
      '/referrals/withdrawals': {
        status: 200,
        body: { success: true, data: { items: [] } },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <ReferralDashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/\/ref\/ABX7K29Q/)).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pul yechish' })).toBeDisabled();
  });
});
