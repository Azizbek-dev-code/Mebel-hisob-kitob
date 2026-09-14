import { SubscriptionStatus, type PersonalAuthUser } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';

import { PersonalBillingGate } from './PersonalBillingGate';

function personalUser(overrides: Partial<PersonalAuthUser['subscription']> = {}): PersonalAuthUser {
  return {
    kind: 'PERSONAL',
    id: 'idn_1',
    email: 'aziz@example.com',
    username: null,
    fullName: 'Aziz Karimov',
    phone: null,
    role: 'PERSONAL',
    responsibilities: [],
    storeId: null,
    storeName: 'Azizning shaxsiy moliyasi',
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
      ...overrides,
    },
  };
}

function me(user: PersonalAuthUser) {
  return { status: 200, body: { success: true, data: { user } } };
}

function renderGate(initial = '/personal/dashboard') {
  return renderWithProviders(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="*" element={<PersonalBillingGate />} />
        <Route path="/personal/billing" element={<p>Billing page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PersonalBillingGate', () => {
  it('shows the trial welcome once until it is marked seen', async () => {
    const fetchMock = mockApi({
      '/auth/me': me(personalUser()),
      '/personal/billing/trial-welcome-seen': {
        status: 200,
        body: {
          success: true,
          data: {
            subscription: personalUser({ trialWelcomeSeenAt: '2026-09-13T12:00:00.000Z' }).subscription,
            currentPlanKey: 'PERSONAL_TRIAL',
            plans: [],
          },
        },
      },
    });
    const user = userEvent.setup();
    renderGate();

    expect(await screen.findByRole('heading', { name: '7 kunlik sinov' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Boshlash' }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).includes('/personal/billing/trial-welcome-seen')),
      ).toBe(true);
    });
    expect(screen.queryByRole('heading', { name: '7 kunlik sinov' })).not.toBeInTheDocument();
  });

  it('does not show welcome after it has been seen', async () => {
    mockApi({
      '/auth/me': me(personalUser({ trialWelcomeSeenAt: '2026-09-13T12:00:00.000Z' })),
    });
    const { queryClient } = renderGate();

    await waitFor(() => {
      expect(queryClient.getQueryData(['auth', 'current-user'])).toMatchObject({
        subscription: { trialWelcomeSeenAt: '2026-09-13T12:00:00.000Z' },
      });
    });
    expect(screen.queryByRole('heading', { name: '7 kunlik sinov' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sinov tugadi' })).not.toBeInTheDocument();
  });

  it('opens the paywall when the personal trial has expired', async () => {
    mockApi({
      '/auth/me': me(
        personalUser({
          status: SubscriptionStatus.EXPIRED,
          storedStatus: 'TRIAL',
          canWrite: false,
          daysRemaining: null,
        }),
      ),
    });
    renderGate();

    expect(await screen.findByRole('heading', { name: 'Sinov tugadi' })).toBeInTheDocument();
    expect(screen.getByText(/Ma’lumotlaringiz saqlanib turibdi/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '7 kunlik sinov' })).not.toBeInTheDocument();
  });
});
