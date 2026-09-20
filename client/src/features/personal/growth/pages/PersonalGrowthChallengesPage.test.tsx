import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalGrowthChallengesPage } from './PersonalGrowthChallengesPage';

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

describe('PersonalGrowthChallengesPage', () => {
  it('shows active fight on 390px', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/growth/todos': {
        status: 200,
        body: { success: true, data: { items: [] } },
      },
      '/personal/growth/friends': {
        status: 200,
        body: {
          success: true,
          data: {
            friends: [
              {
                id: 'fr_1',
                status: 'ACCEPTED',
                iAmRequester: true,
                friend: {
                  identityId: 'idn_2',
                  fullName: 'Jasur',
                  email: null,
                  handle: 'jasur',
                  level: 4,
                  showActivity: true,
                },
                createdAt: '2026-09-17T00:00:00.000Z',
                respondedAt: '2026-09-17T00:00:00.000Z',
              },
            ],
            incoming: [],
            outgoing: [],
            friendCount: 1,
          },
        },
      },
      '/personal/growth/challenges': {
        status: 200,
        body: {
          success: true,
          data: {
            active: [
              {
                id: 'ch_1',
                kind: 'FIGHT',
                title: '7 kun fokus',
                metric: 'FOCUS_MINUTES',
                targetValue: null,
                durationDays: 7,
                status: 'ACTIVE',
                rewardXp: 50,
                startAt: '2026-09-17T00:00:00.000Z',
                endAt: '2026-09-24T00:00:00.000Z',
                winnerId: null,
                completedAt: null,
                createdById: 'idn_1',
                iAmCreator: true,
                myStatus: 'ACCEPTED',
                groupScore: 90,
                participants: [
                  {
                    identityId: 'idn_1',
                    fullName: 'Aziz',
                    handle: 'aziz',
                    status: 'ACCEPTED',
                    score: 50,
                    isCreator: true,
                    isMe: true,
                  },
                  {
                    identityId: 'idn_2',
                    fullName: 'Jasur',
                    handle: 'jasur',
                    status: 'ACCEPTED',
                    score: 40,
                    isCreator: false,
                    isMe: false,
                  },
                ],
                createdAt: '2026-09-17T00:00:00.000Z',
              },
            ],
            incoming: [],
            outgoing: [],
            completed: [],
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalGrowthChallengesPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByText('7 kun fokus')).toBeInTheDocument();
    expect(screen.getAllByText('Jasur').length).toBeGreaterThan(0);
  });
});
