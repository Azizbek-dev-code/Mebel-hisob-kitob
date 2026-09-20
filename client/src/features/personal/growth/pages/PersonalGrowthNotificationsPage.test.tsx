import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalNotificationsPage } from '@/features/personal/lifecycle/pages/PersonalNotificationsPage';

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

describe('PersonalNotificationsPage', () => {
  it('shows inbox item and prefs on 390px', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/notifications': {
        status: 200,
        body: {
          success: true,
          data: {
            unreadCount: 0,
            prefs: {
              notifyBudget: true,
              notifyGoals: true,
              notifyRecurring: true,
              notifyDebts: true,
            },
            items: [],
          },
        },
      },
      '/personal/growth/notifications': {
        status: 200,
        body: {
          success: true,
          data: {
            unreadCount: 1,
            prefs: {
              notifyReminder: true,
              notifyAchievement: true,
              notifyFriend: true,
              notifyFight: true,
              notifyStreak: true,
              notifyResult: true,
            },
            items: [
              {
                id: 'n_1',
                kind: 'FRIEND',
                title: 'Yangi do‘stlik so‘rovi',
                body: 'Kimdir sizga do‘stlik so‘rovi yubordi',
                href: '/personal/growth/friends',
                entityType: 'GROWTH_FRIENDSHIP',
                entityId: 'fr_1',
                readAt: null,
                createdAt: '2026-09-17T12:00:00.000Z',
              },
            ],
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalNotificationsPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Yangi do‘stlik so‘rovi')).toBeInTheDocument();
    expect(screen.getByText('1 o‘qilmagan')).toBeInTheDocument();
  });
});
