import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalGrowthHabitsProgressPage } from './PersonalGrowthHabitsProgressPage';

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

describe('PersonalGrowthHabitsProgressPage', () => {
  it('shows taraqqiyot KPIs and empty-analytics fallbacks', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/growth/habits/progress': {
        status: 200,
        body: {
          success: true,
          data: {
            period: 'MONTH',
            from: '2026-09-01',
            to: '2026-09-17',
            todayKey: '2026-09-17',
            timezone: 'Asia/Tashkent',
            overall: {
              completion: 0.8,
              consistency: 0.8,
              currentStreak: 4,
              longestStreak: 6,
              completed: 8,
              failed: 2,
              skipped: 0,
              scheduled: 10,
              partial: 0,
              average: 1,
              totalValue: 10,
              goalProgress: 0.8,
            },
            calendar: [
              {
                dayKey: '2026-09-17',
                status: 'COMPLETED',
                value: 1,
                progress: 1,
                scheduled: true,
              },
            ],
            trend: [{ key: '2026-W38', label: '2026-W38', completion: 0.8, value: 5 }],
            habits: [
              {
                habitId: 'habit_1',
                title: '20 English words',
                kind: 'GOOD',
                icon: 'flame',
                color: '#4f46e5',
                targetUnit: 'words',
                kpi: {
                  completion: 0.8,
                  consistency: 0.8,
                  currentStreak: 4,
                  longestStreak: 6,
                  completed: 8,
                  failed: 2,
                  skipped: 0,
                  scheduled: 10,
                  partial: 0,
                  average: 1,
                  totalValue: 10,
                  goalProgress: 0.8,
                },
              },
            ],
            analytics: {
              from: '2026-09-01',
              to: '2026-09-17',
              previousFrom: '2026-08-16',
              previousTo: '2026-08-31',
              timezone: 'Asia/Tashkent',
              monthOverMonth: {
                currentCompletion: 0.8,
                previousCompletion: 0.6,
                delta: 0.2,
                currentScheduled: 10,
                previousScheduled: 10,
              },
              mostBroken: null,
              bestWeekday: null,
              bestTime: null,
              correlations: [],
              insights: [{ code: 'COMPLETION_UP', delta: 0.2 }],
              recommendations: [],
            },
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalGrowthHabitsProgressPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Taraqqiyot')).toBeInTheDocument();
    expect(await screen.findByText('20 English words')).toBeInTheDocument();
    expect(screen.getByText(/Bajarilish oshdi/)).toBeInTheDocument();
  });
});
