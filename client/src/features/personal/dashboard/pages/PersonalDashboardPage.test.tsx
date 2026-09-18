import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalDashboardPage } from './PersonalDashboardPage';

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

describe('PersonalDashboardPage', () => {
  it('shows today command center without overflow at 390px', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/summary': {
        status: 200,
        body: {
          success: true,
          data: {
            totalBalanceSom: 100000,
            monthIncomeSom: 50000,
            monthExpenseSom: 20000,
            monthNetSom: 30000,
            wallets: [],
            recentActivity: [],
          },
        },
      },
      '/personal/plan/day': {
        status: 200,
        body: { success: true, data: { date: '2026-09-17', items: [] } },
      },
      '/personal/growth/todos/today': {
        status: 200,
        body: {
          success: true,
          data: {
            focus: [
              {
                id: 't1',
                title: 'React auth',
                description: null,
                priority: 'MEDIUM',
                status: 'TODO',
                category: null,
                dueAt: null,
                remindMinutesBefore: null,
                remindAt: null,
                estimatedMinutes: 25,
                actualMinutes: 0,
                recurrence: 'NONE',
                intervalDays: null,
                isDailyFocus: true,
                completedAt: null,
                linkedGoalId: null,
                linkedCalendarEventId: null,
                createdAt: '2026-09-17T00:00:00.000Z',
                updatedAt: '2026-09-17T00:00:00.000Z',
              },
            ],
            dueToday: [],
            overdue: [],
          },
        },
      },
      '/personal/growth/focus/stats': {
        status: 200,
        body: {
          success: true,
          data: {
            stats: {
              todayMinutes: 25,
              weekMinutes: 80,
              monthMinutes: 200,
              todaySessions: 1,
              activeSession: null,
            },
          },
        },
      },
      '/personal/growth/today-progress': {
        status: 200,
        body: {
          success: true,
          data: {
            progress: {
              dayKey: '2026-09-17',
              percent: 40,
              habitsDue: 1,
              habitsDone: 0,
              dailyGoalsDone: 0,
              dailyGoalsTotal: 1,
              focusTodosDone: 0,
              focusTodosTotal: 1,
              bestCurrentStreak: 3,
            },
          },
        },
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
            },
          },
        },
      },
    });

    const { container } = renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalDashboardPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Bugun' })).toBeInTheDocument();
    expect(await screen.findByText('React auth')).toBeInTheDocument();
    expect(screen.getByText(/Bugungi moliya/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bajarildi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bajarildi' }).className).toMatch(/size-11/);
  });
});
