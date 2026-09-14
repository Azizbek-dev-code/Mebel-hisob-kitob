import { PERSONAL_PLAN_KEY, type PersonalAuthUser, type PersonalBillingResponse } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalBillingPage } from './PersonalBillingPage';

const PERSONAL: PersonalAuthUser = {
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
    status: 'EXPIRED',
    storedStatus: 'TRIAL',
    planId: 'PERSONAL_TRIAL',
    planName: 'Sinov',
    trialEndsAt: '2026-09-01T00:00:00.000Z',
    currentPeriodEnd: '2026-09-01T00:00:00.000Z',
    trialWelcomeSeenAt: '2026-09-01T00:00:00.000Z',
    daysRemaining: null,
    canWrite: false,
    hasPendingPaymentRequest: false,
    featureKeys: [],
    featuresRestricted: false,
  },
};

const BILLING: PersonalBillingResponse = {
  subscription: PERSONAL.subscription,
  currentPlanKey: PERSONAL_PLAN_KEY.TRIAL,
  plans: [
    { key: PERSONAL_PLAN_KEY.TRIAL, trialDays: 7, periodDays: 7, monthlyPriceSom: 0, rank: 0 },
    { key: PERSONAL_PLAN_KEY.PAID, trialDays: 0, periodDays: 30, monthlyPriceSom: 49_000, rank: 1 },
  ],
  pendingRequest: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PersonalBillingPage', () => {
  it('shows the expired trial copy and opens the payment request modal for paid', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/billing': { status: 200, body: { success: true, data: BILLING } },
      '/personal/billing/payment-instructions': {
        status: 200,
        body: {
          success: true,
          data: {
            platformName: 'Test',
            paymentCardNumber: '8600',
            paymentAccountNumber: '20208',
            paymentInstructions: 'Chekni yuklang',
          },
        },
      },
    });
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter>
        <PersonalBillingPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Sinov tugadi/)).toBeInTheDocument();
    const paidCard = screen.getByRole('heading', { name: 'Pullik' }).closest('article');
    expect(paidCard).toBeTruthy();
    await user.click(paidCard!.querySelector('button') as HTMLButtonElement);

    expect(await screen.findByRole('heading', { name: /To‘lov so‘rovi|To'lov so'rovi/ })).toBeInTheDocument();
    expect(screen.getByText(/8600/)).toBeInTheDocument();
  });
});
