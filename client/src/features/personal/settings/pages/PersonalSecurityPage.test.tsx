import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalSecurityPage } from './PersonalSecurityPage';

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
  emailVerified: false,
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

describe('PersonalSecurityPage', () => {
  it('lists sessions and email verification without exposing the main profile form', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/auth/sessions': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'sid_1',
                deviceLabel: 'Chrome · Windows',
                ipAddress: '127.0.0.1',
                lastActiveAt: '2026-09-19T12:00:00.000Z',
                createdAt: '2026-09-19T10:00:00.000Z',
                isCurrent: true,
              },
            ],
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <PersonalSecurityPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Xavfsizlik' })).toBeInTheDocument();
    expect(await screen.findByText('Chrome · Windows')).toBeInTheDocument();
    expect(screen.getByText('Joriy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Email orqali tiklash' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Emailni tasdiqlash' })).toBeInTheDocument();
    expect(screen.getByText('Telefon raqamni tasdiqlash')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Profil ma’lumotlari' })).not.toBeInTheDocument();
  });
});
