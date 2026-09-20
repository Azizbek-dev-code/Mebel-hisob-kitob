import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalGrowthHubPage } from './PersonalGrowthHubPage';

const PERSONAL: PersonalAuthUser = {
  kind: 'PERSONAL',
  id: 'idn_1',
  email: 'aziz@example.com',
  username: null,
  fullName: 'Aziz',
  phone: null,
  role: 'PERSONAL',
  responsibilities: [],
  storeId: null,
  storeName: 'Shaxsiy',
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PersonalGrowthHubPage', () => {
  it('lists growth modules and soft premium hint on 390px', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/growth/quotas': {
        status: 200,
        body: {
          success: true,
          data: {
            quotas: {
              tier: 'FREE',
              premium: false,
              nearLimit: false,
              quotas: {
                activeLearningGoals: 5,
                activeHabits: 8,
                activeChallenges: 2,
                acceptedFriends: 20,
              },
              usage: {
                activeLearningGoals: 1,
                activeHabits: 2,
                activeChallenges: 0,
                acceptedFriends: 0,
              },
            },
          },
        },
      },
      '/personal/growth/habits': {
        status: 200,
        body: { success: true, data: { items: [], activeCount: 0, dueTodayCount: 3, bestCurrentStreak: 0 } },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalGrowthHubPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'O‘sish' })).toBeInTheDocument();
    expect(await screen.findByText(/Sinovda yumshoq limitlar/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tariflar' })).toHaveAttribute('href', '/personal/billing');
    expect(screen.getByRole('link', { name: /Vazifalar/ })).toHaveAttribute(
      'href',
      '/personal/growth/todos',
    );
    expect(screen.getByRole('link', { name: /Odatlar/ })).toHaveAttribute(
      'href',
      '/personal/growth/habits',
    );
    expect(screen.getByRole('link', { name: /Pomodoro/ })).toHaveAttribute(
      'href',
      '/personal/growth/focus',
    );
    expect(screen.queryByRole('link', { name: /Taraqqiyot/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Do‘stlar reytingi/ })).not.toBeInTheDocument();
    expect(
      screen.queryAllByRole('link').filter((el) => el.getAttribute('href') === '/personal/growth/notifications'),
    ).toHaveLength(0);
    expect(
      screen.queryAllByRole('link').filter((el) => el.getAttribute('href') === '/personal/growth/friends'),
    ).toHaveLength(0);
    expect(
      screen.queryAllByRole('link').filter((el) => el.getAttribute('href') === '/personal/growth/goals'),
    ).toHaveLength(0);
  });
});
