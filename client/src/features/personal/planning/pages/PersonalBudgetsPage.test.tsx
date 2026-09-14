import {
  BudgetWarningLevel,
  PersonalBudgetKind,
  PersonalCategoryKind,
  type PersonalAuthUser,
} from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalBudgetsPage } from './PersonalBudgetsPage';

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

const BUDGETS = {
  status: 200,
  body: {
    success: true,
    data: {
      items: [
        {
          id: 'bud_total',
          kind: PersonalBudgetKind.TOTAL,
          name: 'Oy',
          limitSom: 10_000,
          spentSom: 8_000,
          remainingSom: 2_000,
          percent: 80,
          overspentSom: 0,
          warningLevel: BudgetWarningLevel.NEAR,
          periodStart: '2026-09-01T00:00:00.000Z',
          periodEnd: '2026-09-30T23:59:59.999Z',
          isActive: true,
          category: null,
          createdAt: '2026-09-01T00:00:00.000Z',
        },
        {
          id: 'bud_food',
          kind: PersonalBudgetKind.CATEGORY,
          name: 'Oziq-ovqat',
          limitSom: 4_000,
          spentSom: 5_000,
          remainingSom: -1_000,
          percent: 125,
          overspentSom: 1_000,
          warningLevel: BudgetWarningLevel.OVER,
          periodStart: '2026-09-01T00:00:00.000Z',
          periodEnd: '2026-09-30T23:59:59.999Z',
          isActive: true,
          category: { id: 'cat_1', name: 'Oziq-ovqat' },
          createdAt: '2026-09-01T00:00:00.000Z',
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

function renderPage() {
  return renderWithProviders(
    <MemoryRouter>
      <PersonalBudgetsPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PersonalBudgetsPage', () => {
  it('shows overall planned/spent/left and 80/over warnings', async () => {
    mockApi({
      '/auth/me': ME,
      '/personal/budgets': BUDGETS,
      '/personal/categories': CATEGORIES,
    });
    renderPage();

    expect(await screen.findByText('Bu oy umumiy budjet')).toBeInTheDocument();
    expect(screen.getByText('Rejalashtirilgan')).toBeInTheDocument();
    expect(screen.getByText('Sarflangan')).toBeInTheDocument();
    expect(screen.getByText('Qolgan')).toBeInTheDocument();
    expect(screen.getByText('Budjetning 80% ishlatildi.')).toBeInTheDocument();
    expect(screen.getByText(/Budjetdan .* oshib ketdingiz/)).toBeInTheDocument();
    expect(screen.getByText(/O‘tkazma xarajat emas/)).toBeInTheDocument();
    expect(screen.getByText('Kategoriya budjetlari')).toBeInTheDocument();
  });
});
