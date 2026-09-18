import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalGrowthAchievementsPage } from './PersonalGrowthAchievementsPage';

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

const PAYLOAD = {
  items: [
    {
      key: 'FIRST_TASK',
      titleKey: 'firstTask',
      hintKey: 'firstTaskHint',
      rewardXp: 25,
      comingSoon: false,
      unlocked: true,
      unlockedAt: '2026-09-17T10:00:00.000Z',
    },
    {
      key: 'STREAK_7',
      titleKey: 'streak7',
      hintKey: 'streak7Hint',
      rewardXp: 40,
      comingSoon: false,
      unlocked: false,
      unlockedAt: null,
    },
  ],
  unlockedCount: 1,
  totalCount: 13,
  newlyUnlocked: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PersonalGrowthAchievementsPage', () => {
  it('shows unlocked and locked badges on 390px', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/growth/achievements': {
        status: 200,
        body: { success: true, data: PAYLOAD },
      },
      '/personal/growth/achievements/evaluate': {
        status: 200,
        body: { success: true, data: PAYLOAD },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalGrowthAchievementsPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Yutuqlar' })).toBeInTheDocument();
    expect(await screen.findByText('Birinchi vazifa')).toBeInTheDocument();
    expect(screen.getByText('7 kunlik streak')).toBeInTheDocument();
    expect(screen.getByText('+25 XP')).toBeInTheDocument();
  });
});
