import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalGrowthFriendsPage } from './PersonalGrowthFriendsPage';

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

describe('PersonalGrowthFriendsPage', () => {
  it('shows friends list on 390px', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
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
                  presence: { online: true, lastSeenAt: '2026-09-21T12:00:00.000Z' },
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
      '/personal/growth/friends/privacy': {
        status: 200,
        body: {
          success: true,
          data: {
            privacy: {
              handle: 'aziz',
              bio: null,
              showLevel: true,
              showActivity: true,
              allowFriendRequests: true,
              onlineStatusVisibility: 'FRIENDS',
              lastSeenVisibility: 'FRIENDS',
              showInGlobalRanking: true,
            },
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalGrowthFriendsPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Do‘stlar' })).toBeInTheDocument();
    expect(await screen.findByText('Jasur')).toBeInTheDocument();
    expect(screen.getByText(/@jasur/)).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });
});
