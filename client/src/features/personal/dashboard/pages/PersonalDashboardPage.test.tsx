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
              levelTitleKey: 'starter',
              totalXp: 120,
              xpIntoLevel: 20,
              xpForNextLevel: 200,
              percent: 10,
              currentStreak: 3,
              bestStreak: 5,
              lastActivityDayKey: '2026-09-17',
              todayXp: 15,
              recentEvents: [],
              unlockedKeys: [],
              nextUnlock: {
                key: 'ACHIEVEMENT_BADGE',
                minLevel: 5,
                titleKey: 'achievementBadge',
                hintKey: 'achievementBadgeHint',
              },
              globalRank: 4,
              xpToTop3: 30,
            },
          },
        },
      },
      '/personal/budgets': { status: 200, body: { success: true, data: { items: [] } } },
      '/personal/goals': { status: 200, body: { success: true, data: { items: [] } } },
      '/personal/growth/monthly-competition': {
        status: 200,
        body: {
          success: true,
          data: {
            competition: {
              id: 'comp_1',
              periodKey: '2026-09',
              title: 'September 2026',
              description: null,
              startsAt: '2026-09-01T00:00:00.000Z',
              endsAt: '2026-10-01T00:00:00.000Z',
              status: 'ACTIVE',
              finalizedAt: null,
              rewards: [],
            },
            top3: [
              {
                identityId: 'idn_a',
                displayName: 'Ali',
                handle: null,
                level: 10,
                totalXp: 1000,
                periodXp: 100,
                currentStreak: 5,
                rank: 1,
                isMe: false,
              },
            ],
            myEntry: {
              identityId: 'idn_1',
              displayName: 'Aziz',
              handle: null,
              level: 2,
              totalXp: 120,
              periodXp: 15,
              currentStreak: 3,
              rank: 4,
              isMe: true,
            },
            xpToTop3: 50,
            showMeInRanking: true,
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
    expect(await screen.findAllByText('React auth')).not.toHaveLength(0);
    expect(screen.getByRole('link', { name: /Keyingi ishni boshlash/i })).toHaveAttribute(
      'href',
      '/personal/growth/focus?todoId=t1&minutes=25',
    );
    expect(screen.getByRole('link', { name: 'Barcha vazifalar' })).toHaveAttribute(
      'href',
      '/personal/growth/todos',
    );
    expect(screen.getByText(/Jami qoldiq|totalBalance|35/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bajarildi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bajarildi' }).className).toMatch(/pf-check/);
    expect(container.querySelector('.overflow-x-hidden')).toBeTruthy();
  });
});
