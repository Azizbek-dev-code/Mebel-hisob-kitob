import {
  PersonalCategoryKind,
  PersonalEntryType,
  PersonalWalletKind,
  type PersonalAuthUser,
} from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';

import { PersonalHistoryPage } from './PersonalHistoryPage';

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
const WALLETS = {
  status: 200,
  body: {
    success: true,
    data: {
      items: [
        {
          id: 'wal_1',
          name: 'Naqd',
          kind: PersonalWalletKind.CASH,
          openingBalanceSom: 0,
          balanceSom: 0,
          sortOrder: 0,
          isArchived: false,
        },
      ],
    },
  },
};
const CATEGORIES = {
  status: 200,
  body: {
    success: true,
    data: {
      items: [
        {
          id: 'cat_1',
          kind: PersonalCategoryKind.EXPENSE,
          key: 'FOOD',
          name: 'Oziq-ovqat',
          color: 'teal',
          sortOrder: 0,
          isActive: true,
        },
      ],
    },
  },
};

const HISTORY = {
  status: 200,
  body: {
    success: true,
    data: {
      items: [
        {
          kind: 'TRANSFER',
          occurredAt: '2026-09-13T13:00:00.000Z',
          createdAt: '2026-09-13T13:00:00.000Z',
          transfer: {
            id: 'tr_1',
            amount: 2_000,
            occurredAt: '2026-09-13T13:00:00.000Z',
            note: null,
            status: 'ACTIVE',
            fromWallet: { id: 'wal_1', name: 'Naqd', kind: PersonalWalletKind.CASH },
            toWallet: { id: 'wal_2', name: 'Karta', kind: PersonalWalletKind.CARD },
            createdAt: '2026-09-13T13:00:00.000Z',
          },
        },
        {
          kind: 'ENTRY',
          occurredAt: '2026-09-13T12:00:00.000Z',
          createdAt: '2026-09-13T12:00:00.000Z',
          entry: {
            id: 'ent_1',
            type: PersonalEntryType.EXPENSE,
            amount: 5_000,
            occurredAt: '2026-09-13T12:00:00.000Z',
            note: 'non',
            status: 'ACTIVE',
            wallet: { id: 'wal_1', name: 'Naqd', kind: PersonalWalletKind.CASH },
            category: {
              id: 'cat_1',
              name: 'Oziq-ovqat',
              color: 'teal',
              kind: PersonalCategoryKind.EXPENSE,
            },
            createdAt: '2026-09-13T12:00:00.000Z',
          },
        },
      ],
      totals: { incomeSom: 0, expenseSom: 5_000, netSom: -5_000, transferSom: 2_000 },
      meta: { page: 1, pageSize: 50, totalItems: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPage() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/personal/history']}>
      <PersonalHistoryPage />
    </MemoryRouter>,
  );
}

describe('PersonalHistoryPage', () => {
  it('shows period totals without treating a transfer as an expense', async () => {
    mockApi({
      '/auth/me': ME,
      '/personal/history': HISTORY,
      '/personal/wallets': WALLETS,
      '/personal/categories': CATEGORIES,
    });
    renderPage();

    expect((await screen.findAllByText('Oziq-ovqat')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('O‘tkazma').length).toBeGreaterThan(1);
    expect(screen.getByRole('button', { name: 'Oy' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hafta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kun' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/O‘tkazma daromad yoki xarajat emas/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Izoh, kategoriya yoki hisob')).toBeInTheDocument();
  });

  it('filters to expenses only', async () => {
    const fetchMock = mockApi({
      '/auth/me': ME,
      '/personal/history': HISTORY,
      '/personal/wallets': WALLETS,
      '/personal/categories': CATEGORIES,
    });
    renderPage();
    await screen.findAllByText('Oziq-ovqat');
    await userEvent.click(screen.getByRole('button', { name: 'Chiqim' }));

    await waitFor(() => {
      const historyCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes('/personal/history'));
      expect(historyCalls.some((call) => String(call[0]).includes('kind=EXPENSE'))).toBe(true);
    });
  });
});
