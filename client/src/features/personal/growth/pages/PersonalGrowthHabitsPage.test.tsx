import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalGrowthHabitsPage } from './PersonalGrowthHabitsPage';

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

describe('PersonalGrowthHabitsPage', () => {
  it('shows habits without daily goals on 390px layout', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/growth/habits': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'habit_1',
                title: '20 English words',
                description: null,
                category: 'Language',
                frequency: 'DAILY',
                intervalDays: null,
                targetValue: 20,
                targetUnit: 'words',
                remindMinutesBefore: null,
                linkedGoalId: null,
                isArchived: false,
                sortOrder: 0,
                currentStreak: 5,
                bestStreak: 12,
                todayCheckIn: null,
                todayValue: 0,
                todayProgress: 0,
                todayStatus: 'NONE',
                dueToday: true,
                kind: 'GOOD',
                badMode: null,
                icon: 'flame',
                color: '#4f46e5',
                scheduleKind: 'EVERY_DAY',
                weekdays: [],
                startDayKey: '2026-09-01',
                endDayKey: null,
                timeOfDay: 'ANY',
                reminderEnabled: false,
                reminderTime: null,
                goalPeriod: 'DAY',
                notes: null,
                stackAfterHabitId: null,
                stackCue: null,
                checklist: [],
                createdAt: '2026-09-17T00:00:00.000Z',
                updatedAt: '2026-09-17T00:00:00.000Z',
              },
            ],
            activeCount: 1,
            dueTodayCount: 1,
            bestCurrentStreak: 5,
          },
        },
      },
      '/personal/growth/daily-goals': {
        status: 200,
        body: {
          success: true,
          data: {
            dayKey: '2026-09-17',
            items: [
              {
                id: 'g1',
                dayKey: '2026-09-17',
                title: 'IELTS — 1h',
                estimatedMinutes: 60,
                isDone: false,
                sortOrder: 0,
                completedAt: null,
                createdAt: '2026-09-17T00:00:00.000Z',
              },
            ],
            doneCount: 0,
            totalCount: 1,
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalGrowthHabitsPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Odatlar' })).toBeInTheDocument();
    expect(await screen.findByText('20 English words')).toBeInTheDocument();
    expect(screen.queryByText('IELTS — 1h')).not.toBeInTheDocument();
    expect(screen.queryByText('Bugungi 3 maqsad')).not.toBeInTheDocument();
  });
});
