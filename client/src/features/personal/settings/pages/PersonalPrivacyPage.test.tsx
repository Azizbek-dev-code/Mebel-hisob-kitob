import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalPrivacyPage } from './PersonalPrivacyPage';

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

describe('PersonalPrivacyPage', () => {
  it('renders online, last seen and ranking privacy controls', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
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
        <PersonalPrivacyPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Maxfiylik' })).toBeInTheDocument();
    expect(await screen.findByText('aziz@example.com')).toBeInTheDocument();
    expect(screen.getByText('Tasdiqlanmagan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Emailni tasdiqlash' })).toBeInTheDocument();
    expect(await screen.findByText('Onlayn holat')).toBeInTheDocument();
    expect(screen.getByText('Oxirgi faollik')).toBeInTheDocument();
    expect(screen.getByText('Meni global reytingda ko‘rsat')).toBeInTheDocument();
  });
});
