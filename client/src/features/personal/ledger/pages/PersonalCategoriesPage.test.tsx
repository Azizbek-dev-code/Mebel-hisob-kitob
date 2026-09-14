import { PersonalCategoryKind, type PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalCategoriesPage } from './PersonalCategoriesPage';

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
        {
          id: 'cat_2',
          kind: PersonalCategoryKind.EXPENSE,
          key: null,
          name: 'Eski',
          color: 'slate',
          sortOrder: 1,
          isActive: false,
        },
        {
          id: 'cat_3',
          kind: PersonalCategoryKind.INCOME,
          key: 'SALARY',
          name: 'Ish haqi',
          color: 'indigo',
          sortOrder: 0,
          isActive: true,
        },
      ],
    },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PersonalCategoriesPage', () => {
  it('explains categories are not accounts and splits archived items', async () => {
    mockApi({ '/auth/me': ME, '/personal/categories': CATEGORIES });
    renderWithProviders(
      <MemoryRouter>
        <PersonalCategoriesPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(
        'Hisob — pulning joyi. Kategoriya — nima uchun kirdi yoki chiqdi. Masalan, Oziq-ovqat hisob emas.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hisoblarga o‘tish' })).toHaveAttribute(
      'href',
      '/personal/accounts',
    );
    expect(await screen.findByText('Oziq-ovqat')).toBeInTheDocument();
    expect(screen.getByText('Eski')).toBeInTheDocument();
    expect(screen.getAllByText('Yashirilgan').length).toBeGreaterThan(0);
    expect(await screen.findByRole('button', { name: 'Xarajatlar' })).toBeInTheDocument();
  });
});
