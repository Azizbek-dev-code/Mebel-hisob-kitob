import {
  PersonalEntryType,
  PersonalRecurringDueState,
  PersonalRecurringFrequency,
  type PersonalAuthUser,
} from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalRecurringPage } from './PersonalRecurringPage';

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
    trialWelcomeSeenAt: null,
    daysRemaining: 7,
    canWrite: true,
    hasPendingPaymentRequest: false,
    featureKeys: [],
    featuresRestricted: false,
  },
};

const ME = { status: 200, body: { success: true, data: { user: PERSONAL } } };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PersonalRecurringPage', () => {
  it('explains reminders are not auto-pay and lists an upcoming bill', async () => {
    mockApi({
      '/auth/me': ME,
      '/personal/recurring': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'rec_1',
                name: 'Internet',
                type: PersonalEntryType.EXPENSE,
                amountSom: 3_000,
                frequency: PersonalRecurringFrequency.MONTHLY,
                intervalDays: null,
                dayOfMonth: 5,
                nextDueAt: '2026-10-05T00:00:00.000Z',
                dueState: PersonalRecurringDueState.DUE,
                note: null,
                isActive: true,
                wallet: null,
                category: null,
                createdAt: '2026-09-13T00:00:00.000Z',
              },
            ],
            upcoming: [],
          },
        },
      },
      '/personal/wallets': { status: 200, body: { success: true, data: { items: [] } } },
      '/personal/categories': { status: 200, body: { success: true, data: { items: [] } } },
    });
    renderWithProviders(
      <MemoryRouter>
        <PersonalRecurringPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Internet')).toBeInTheDocument();
    expect(screen.getByText(/Hisobdan avtomatik ayrilmaydi/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Qarzlar' })).not.toBeInTheDocument();
  });
});
