import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalGrowthLevelPage } from './PersonalGrowthLevelPage';

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

describe('PersonalGrowthLevelPage', () => {
  it('shows level, streak and recent XP on 390px', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/growth/progress': {
        status: 200,
        body: {
          success: true,
          data: {
            progress: {
              totalXp: 150,
              level: 2,
              xpIntoLevel: 50,
              xpForNextLevel: 200,
              percent: 25,
              currentStreak: 5,
              bestStreak: 12,
              lastActivityDayKey: '2026-09-17',
              todayXp: 45,
              recentEvents: [
                {
                  id: 'xe_1',
                  source: 'TODO_COMPLETED',
                  amount: 15,
                  sourceEntityId: 'todo_1',
                  dayKey: '2026-09-17',
                  summary: 'Todo: React auth',
                  createdAt: '2026-09-17T10:00:00.000Z',
                },
              ],
            },
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalGrowthLevelPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Level' })).toBeInTheDocument();
    expect(await screen.findByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('+45')).toBeInTheDocument();
    expect(screen.getByText('Todo: React auth')).toBeInTheDocument();
  });
});
