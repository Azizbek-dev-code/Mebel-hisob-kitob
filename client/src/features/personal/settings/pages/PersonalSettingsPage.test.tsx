import {
  WorkspaceMembershipRole,
  WorkspaceStatus,
  WorkspaceType,
  type PersonalAuthUser,
} from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalSettingsPage } from './PersonalSettingsPage';

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
    trialWelcomeSeenAt: null,
    daysRemaining: 7,
    canWrite: true,
    hasPendingPaymentRequest: false,
    featureKeys: [],
    featuresRestricted: false,
  },
};

const ME = { status: 200, body: { success: true, data: { user: PERSONAL } } };

const ACCOUNTS = {
  status: 200,
  body: {
    success: true,
    data: {
      items: [
        {
          id: 'ws_1',
          type: WorkspaceType.PERSONAL,
          name: 'Azizning shaxsiy moliyasi',
          status: WorkspaceStatus.ACTIVE,
          storeId: null,
          createdAt: '2026-09-01T00:00:00.000Z',
          role: WorkspaceMembershipRole.OWNER,
        },
      ],
    },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PersonalSettingsPage', () => {
  it('shows profile account controls without burying finance modules', async () => {
    mockApi({
      '/auth/me': ME,
      '/accounts': ACCOUNTS,
      '/personal/growth/progress': {
        status: 200,
        body: {
          success: true,
          data: {
            progress: {
              totalXp: 7850,
              level: 12,
              xpIntoLevel: 7850,
              xpForNextLevel: 10000,
              percent: 78.5,
              currentStreak: 4,
              bestStreak: 8,
              lastActivityDayKey: '2026-09-19',
              todayXp: 20,
              recentEvents: [],
            },
          },
        },
      },
    });
    renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalSettingsPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Profil' })).toBeInTheDocument();
    expect(screen.getByText('Joriy hisob')).toBeInTheDocument();
    expect(screen.getByTestId('add-account')).toHaveAttribute('href', '/onboarding');
    expect(screen.getAllByText('Yangi hisob ochish')).toHaveLength(1);
    expect(screen.queryByText(/Avval shaxsiy yoki biznesni tanlaysiz/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Hisoblar/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Kategoriyalar/ })).toHaveAttribute(
      'href',
      '/personal/categories',
    );
    expect(screen.getByRole('link', { name: /^Takroriy/ })).toHaveAttribute(
      'href',
      '/personal/recurring',
    );
    expect(
      screen.getAllByRole('link').find((el) => el.getAttribute('href') === '/personal/growth/friends'),
    ).toBeTruthy();
    expect(
      screen.getAllByRole('link').find((el) => el.getAttribute('href') === '/personal/growth/social'),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: /Bildirishnomalar/ })).toHaveAttribute(
      'href',
      '/personal/notifications',
    );
    expect(screen.getByRole('link', { name: /Tariflar/ })).toHaveAttribute('href', '/personal/billing');
    expect(screen.getByRole('link', { name: /Referral/ })).toHaveAttribute('href', '/personal/referral');
    expect(screen.getByRole('link', { name: /Profil ma’lumotlari/ })).toHaveAttribute(
      'href',
      '/personal/profile/edit',
    );
    expect(screen.getByRole('link', { name: /^Xavfsizlik/ })).toHaveAttribute(
      'href',
      '/personal/profile/security',
    );
    expect(screen.getByRole('link', { name: /Fikr bildirish/ })).toHaveAttribute(
      'href',
      '/personal/profile/feedback',
    );
    expect(screen.queryByRole('button', { name: /^Saqlash$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chiqish/i })).toBeInTheDocument();
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
  });
});
