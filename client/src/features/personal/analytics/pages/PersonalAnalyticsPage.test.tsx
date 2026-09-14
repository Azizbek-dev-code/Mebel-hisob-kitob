import {
  PersonalCategoryKind,
  PersonalEntryType,
  type PersonalAuthUser,
  type PersonalAnalyticsResponse,
} from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalAnalyticsPage } from './PersonalAnalyticsPage';

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
    status: 'TRIAL',
    storedStatus: 'TRIAL',
    planId: 'PERSONAL_TRIAL',
    planName: 'Sinov',
    trialEndsAt: '2026-09-20T00:00:00.000Z',
    currentPeriodEnd: '2026-09-20T00:00:00.000Z',
    trialWelcomeSeenAt: '2026-09-13T12:00:00.000Z',
    daysRemaining: 7,
    canWrite: true,
    hasPendingPaymentRequest: false,
    featureKeys: [],
    featuresRestricted: false,
  },
};

const ANALYTICS: PersonalAnalyticsResponse = {
  months: 1,
  periodStart: '2026-09-01T00:00:00.000Z',
  periodEnd: '2026-09-30T23:59:59.999Z',
  incomeSom: 0,
  expenseSom: 5_000,
  netSom: -5_000,
  savingsRatePercent: null,
  previous: { incomeSom: 0, expenseSom: 0, netSom: 0, savingsRatePercent: null },
  byCategory: [
    {
      categoryId: 'cat_food',
      name: 'Oziq-ovqat',
      kind: PersonalCategoryKind.EXPENSE,
      type: PersonalEntryType.EXPENSE,
      amountSom: 5_000,
    },
    {
      categoryId: 'cat_salary',
      name: 'Ish haqi',
      kind: PersonalCategoryKind.INCOME,
      type: PersonalEntryType.INCOME,
      amountSom: 8_000,
    },
  ],
  monthly: [
    {
      yearMonth: '2026-09',
      incomeSom: 0,
      expenseSom: 5_000,
      netSom: -5_000,
      savingsRatePercent: null,
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PersonalAnalyticsPage', () => {
  it('shows period chips, expense categories and keeps transfers out of copy', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/analytics': { status: 200, body: { success: true, data: ANALYTICS } },
    });
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter>
        <PersonalAnalyticsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Tahlil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3 oy' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText(/O‘tkazma daromad yoki xarajat emas/)).toBeInTheDocument();
    expect(await screen.findByText('Oziq-ovqat')).toBeInTheDocument();
    expect(screen.queryByText('Ish haqi')).not.toBeInTheDocument();
    expect(screen.getByText('Sentabr 2026')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Kirim' }));
    expect(screen.getByText('Ish haqi')).toBeInTheDocument();
    expect(screen.queryByText('Oziq-ovqat')).not.toBeInTheDocument();
  });
});
