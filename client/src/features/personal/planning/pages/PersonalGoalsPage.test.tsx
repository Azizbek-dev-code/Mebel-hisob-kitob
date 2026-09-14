import { GoalEtaKind, PersonalSavingGoalStatus, type PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalGoalsPage } from './PersonalGoalsPage';

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

const GOALS = {
  status: 200,
  body: {
    success: true,
    data: {
      items: [
        {
          id: 'goal_1',
          name: 'Mashina',
          targetSom: 10_000,
          savedSom: 2_000,
          remainingSom: 8_000,
          percent: 20,
          targetDate: null,
          monthlyContributionSom: 2_000,
          requiredMonthlySom: null,
          estimatedReachAt: '2027-01-13T12:00:00.000Z',
          etaKind: GoalEtaKind.MONTHLY,
          onTrack: null,
          status: PersonalSavingGoalStatus.ACTIVE,
          contributions: [],
          createdAt: '2026-09-13T00:00:00.000Z',
        },
      ],
    },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PersonalGoalsPage', () => {
  it('explains ETA from monthly set-aside instead of a far-future daily guess', async () => {
    mockApi({ '/auth/me': ME, '/personal/goals': GOALS });
    renderWithProviders(
      <MemoryRouter>
        <PersonalGoalsPage />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('Mashina')).length).toBeGreaterThan(0);
    expect(screen.getByText(/Har oy .* ajratsangiz, taxminan/)).toBeInTheDocument();
    expect(screen.getByText(/Hisobdan avtomatik ayrilmaydi/)).toBeInTheDocument();
    expect(screen.getByText('Har oylik ajratma')).toBeInTheDocument();
    expect(screen.queryByText(/2067/)).not.toBeInTheDocument();
  });
});
