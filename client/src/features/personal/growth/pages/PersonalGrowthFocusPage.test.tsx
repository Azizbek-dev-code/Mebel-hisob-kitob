import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalGrowthFocusPage } from './PersonalGrowthFocusPage';

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

describe('PersonalGrowthFocusPage', () => {
  it('shows focus stats, habit selector and start controls on 390px layout', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/growth/focus/stats': {
        status: 200,
        body: {
          success: true,
          data: {
            stats: {
              todayMinutes: 140,
              weekMinutes: 400,
              monthMinutes: 900,
              todaySessions: 5,
              activeSession: null,
            },
          },
        },
      },
      '/personal/growth/todos': {
        status: 200,
        body: { success: true, data: { items: [], openCount: 0, doneTodayCount: 0 } },
      },
      '/personal/growth/habits': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'habit_1',
                title: 'English',
                isArchived: false,
                kind: 'GOOD',
                icon: null,
                color: null,
                frequency: 'DAILY',
                scheduleKind: 'EVERY_DAY',
                targetValue: 1,
                targetUnit: 'count',
                todayStatus: 'NONE',
                todayProgress: 0,
                dueToday: true,
                scheduled: true,
                currentStreak: 0,
                bestStreak: 0,
              },
            ],
            activeCount: 1,
            dueTodayCount: 1,
            bestCurrentStreak: 0,
            todayKey: '2026-09-17',
            viewDayKey: '2026-09-17',
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/personal/growth/focus?habitId=habit_1&minutes=25']}>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalGrowthFocusPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Pomodoro' })).toBeInTheDocument();
    expect(await screen.findByText('2h 20m')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fokus boshlash' })).toBeInTheDocument();
    expect(screen.getByText('25/5')).toBeInTheDocument();
    expect(screen.getByText('Umumiy fokus')).toBeInTheDocument();
    expect(screen.getByDisplayValue('English')).toBeInTheDocument();
  });
});
