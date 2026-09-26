import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PersonalLayout } from '@/features/personal/layout/PersonalLayout';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

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
    trialWelcomeSeenAt: '2026-09-01T00:00:00.000Z',
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

const NOTIFY_ROUTES = {
  '/personal/notifications': {
    status: 200,
    body: { success: true, data: { items: [], prefs: {}, unreadCount: 0 } },
  },
  '/personal/growth/notifications': {
    status: 200,
    body: {
      success: true,
      data: {
        items: [],
        unreadCount: 0,
        prefs: {
          notifyReminder: true,
          notifyAchievement: true,
          notifyFriend: true,
          notifyFight: true,
          notifyStreak: true,
          notifyResult: true,
        },
      },
    },
  },
} as const;

const LAYOUT_APIS = {
  '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
  '/accounts': { status: 200, body: { success: true, data: { items: [] } } },
  '/personal/billing': {
    status: 200,
    body: {
      success: true,
      data: {
        subscription: PERSONAL.subscription,
        plans: [],
        paymentInstructions: null,
        pendingRequest: null,
      },
    },
  },
  '/personal/feedback/status': {
    status: 200,
    body: { success: true, data: { prompts: { showOnboarding: false, showOutcome: false } } },
  },
  '/personal/growth/progress': {
    status: 200,
    body: {
      success: true,
      data: {
        progress: {
          level: 2,
          totalXp: 120,
          xpIntoLevel: 20,
          xpForNextLevel: 200,
          percent: 10,
          currentStreak: 3,
          bestStreak: 5,
          lastActivityDayKey: '2026-09-17',
          todayXp: 15,
          recentEvents: [],
          levelTitleKey: 'starter',
          unlockedKeys: [],
          nextUnlock: null,
          globalRank: null,
          xpToTop3: null,
        },
      },
    },
  },
  ...NOTIFY_ROUTES,
} as const;

describe('PersonalLayout navigation', () => {
  it('renders the five O‘sish primary tabs without overflow class on the shell', async () => {
    mockApi(LAYOUT_APIS);

    const { container } = renderWithProviders(
      <MemoryRouter initialEntries={['/personal/dashboard']}>
        <div className="w-[390px]">
          <PersonalLayout />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText('O‘sish')).not.toHaveLength(0);
    expect(screen.getAllByText('Bosh').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reja').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Moliya').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Profil').length).toBeGreaterThan(0);
    expect(screen.queryByText('Global reyting')).not.toBeInTheDocument();
    expect(container.querySelector('.pf-shell.overflow-x-hidden')).toBeTruthy();
    expect(container.querySelector('nav ul.grid-cols-5')).toBeTruthy();
    expect(screen.getByLabelText('Qo‘shish')).toBeInTheDocument();
  });

  it('keeps quick-actions FAB available on Growth routes at 390px', async () => {
    mockApi(LAYOUT_APIS);

    renderWithProviders(
      <MemoryRouter initialEntries={['/personal/growth']}>
        <div className="w-[390px]">
          <PersonalLayout />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText('O‘sish')).not.toHaveLength(0);
    expect(screen.getByLabelText('Qo‘shish')).toBeInTheDocument();
  });
});
