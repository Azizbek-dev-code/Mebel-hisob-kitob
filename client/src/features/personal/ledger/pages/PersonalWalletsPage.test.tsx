import { PersonalWalletKind, type PersonalAuthUser } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalWalletsPage } from './PersonalWalletsPage';

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
          balanceSom: 8_000,
          sortOrder: 0,
          isArchived: false,
        },
        {
          id: 'wal_food',
          name: 'Oziq-ovqat',
          kind: PersonalWalletKind.OTHER,
          openingBalanceSom: 0,
          balanceSom: 0,
          sortOrder: 1,
          isArchived: false,
        },
        {
          id: 'wal_old',
          name: 'Eski karta',
          kind: PersonalWalletKind.CARD,
          openingBalanceSom: 0,
          balanceSom: 500,
          sortOrder: 2,
          isArchived: true,
        },
      ],
    },
  },
};

function renderPage() {
  return renderWithProviders(
    <MemoryRouter>
      <PersonalWalletsPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PersonalWalletsPage', () => {
  it('separates accounts from categories and keeps archived wallets apart', async () => {
    mockApi({ '/auth/me': ME, '/personal/wallets': WALLETS });
    renderPage();

    expect(
      await screen.findByText(
        'Hisob — pulning joyi. Kategoriya — nima uchun kirdi yoki chiqdi. Masalan, Oziq-ovqat hisob emas.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kategoriyalarga o‘tish' })).toHaveAttribute(
      'href',
      '/personal/categories',
    );
    expect(await screen.findByText('Faol hisoblar')).toBeInTheDocument();
    expect(screen.getByText('Yashirilgan hisoblar')).toBeInTheDocument();
    expect(screen.getByText('Eski karta')).toBeInTheDocument();
    expect(screen.getAllByText(/Bu nom kategoriya uchun/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Payme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uzcard' })).toBeInTheDocument();
  });

  it('warns when the new wallet name matches a category', async () => {
    mockApi({ '/auth/me': ME, '/personal/wallets': WALLETS });
    renderPage();

    const input = await screen.findByPlaceholderText('Hisob nomi');
    await userEvent.type(input, 'Oziq-ovqat');

    expect(screen.getAllByText(/Bu nom kategoriya uchun/).length).toBeGreaterThan(1);
  });
});
