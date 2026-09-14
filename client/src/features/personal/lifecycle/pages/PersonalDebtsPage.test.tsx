import { PersonalDebtDirection, PersonalDebtStatus, type PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalDebtsPage } from './PersonalDebtsPage';

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

describe('PersonalDebtsPage', () => {
  it('shows person-to-person debt, not store customer debt', async () => {
    mockApi({
      '/auth/me': ME,
      '/personal/debts': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'debt_1',
                direction: PersonalDebtDirection.LENT,
                personName: 'Ali',
                principalSom: 10_000,
                paidSom: 4_000,
                remainingSom: 6_000,
                occurredAt: '2026-09-01T00:00:00.000Z',
                dueAt: '2026-09-10T00:00:00.000Z',
                note: null,
                status: PersonalDebtStatus.OVERDUE,
                isArchived: false,
                payments: [],
                createdAt: '2026-09-01T00:00:00.000Z',
              },
            ],
            lentOutstandingSom: 6_000,
            borrowedOutstandingSom: 0,
          },
        },
      },
    });
    renderWithProviders(
      <MemoryRouter>
        <PersonalDebtsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Ali')).toBeInTheDocument();
    expect(screen.getByText(/Do‘kon mijoz qarzi emas/)).toBeInTheDocument();
    expect(screen.getByText('Qarz berdim')).toBeInTheDocument();
    expect(screen.queryByText('Mijozlar')).not.toBeInTheDocument();
  });
});
