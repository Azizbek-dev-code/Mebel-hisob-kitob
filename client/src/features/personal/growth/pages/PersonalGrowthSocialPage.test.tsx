import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalGrowthSocialPage } from './PersonalGrowthSocialPage';

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

describe('PersonalGrowthSocialPage', () => {
  it('shows friends weekly leaderboard and streak on 390px', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/growth/leaderboard': {
        status: 200,
        body: {
          success: true,
          data: {
            period: 'WEEKLY',
            metric: 'XP',
            startDayKey: '2026-09-11',
            endDayKey: '2026-09-17',
            entries: [
              {
                rank: 1,
                identityId: 'idn_2',
                fullName: 'Jasur',
                handle: 'jasur',
                score: 240,
                level: 4,
                isMe: false,
                scoreVisible: true,
              },
              {
                rank: 2,
                identityId: 'idn_1',
                fullName: 'Aziz',
                handle: 'aziz',
                score: 180,
                level: 3,
                isMe: true,
                scoreVisible: true,
              },
            ],
          },
        },
      },
      '/personal/growth/friend-streaks': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                pairKey: 'idn_1:idn_2',
                friend: {
                  identityId: 'idn_2',
                  fullName: 'Jasur',
                  handle: 'jasur',
                },
                currentStreak: 5,
                bestStreak: 8,
                lastSharedDayKey: '2026-09-17',
                bothActiveToday: true,
              },
            ],
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalGrowthSocialPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText('Jasur')).not.toHaveLength(0);
    expect(screen.getByText('240 XP')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
