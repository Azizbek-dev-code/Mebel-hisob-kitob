import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalGlobalRankingPage } from './PersonalGlobalRankingPage';

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

describe('PersonalGlobalRankingPage', () => {
  it('shows public rank rows and keeps the viewer position visible', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/growth/global-ranking': {
        status: 200,
        body: {
          success: true,
          data: {
            period: 'WEEKLY',
            items: [
              {
                identityId: 'idn_other',
                displayName: 'Jasur',
                handle: 'jasur',
                level: 8,
                totalXp: 900,
                currentStreak: 12,
                periodXp: 40,
                rank: 1,
                isMe: false,
              },
            ],
            myRank: 4,
            myEntry: {
              identityId: 'idn_1',
              displayName: 'Aziz',
              handle: 'aziz',
              level: 4,
              totalXp: 120,
              currentStreak: 3,
              periodXp: 10,
              rank: 4,
              isMe: true,
            },
            page: 1,
            pageSize: 20,
            totalItems: 4,
            totalPages: 1,
            showMeInRanking: true,
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <PersonalGlobalRankingPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Global reyting' })).toBeInTheDocument();
    expect(await screen.findByText('Jasur')).toBeInTheDocument();
    expect(screen.getByText('Aziz')).toBeInTheDocument();
    expect(screen.queryByText('aziz@example.com')).not.toBeInTheDocument();
  });
});
