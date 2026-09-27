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
                scheduled: true,
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
            timezone: 'Asia/Tashkent',
            todayKey: '2026-09-17',
            viewDayKey: '2026-09-17',
          },
        },
      },
      '/personal/growth/habits/progress': {
        status: 200,
        body: {
          success: true,
          data: {
            period: 'CUSTOM',
            from: '2026-09-01',
            to: '2026-09-30',
            todayKey: '2026-09-17',
            timezone: 'Asia/Tashkent',
            overall: {
              completion: 0,
              consistency: 0,
              currentStreak: 5,
              longestStreak: 12,
              completed: 0,
              failed: 0,
              skipped: 0,
              scheduled: 0,
              partial: 0,
              average: 0,
              totalValue: 0,
              goalProgress: 0,
            },
            calendar: [],
            dayPerformance: [],
            performanceBreakdown: { full: 0, partial: 0, missed: 0, noPlan: 0 },
            weeklyRhythm: [
              { weekday: 1, completion: null, sampleSize: 0 },
              { weekday: 2, completion: null, sampleSize: 0 },
              { weekday: 3, completion: null, sampleSize: 0 },
              { weekday: 4, completion: null, sampleSize: 0 },
              { weekday: 5, completion: null, sampleSize: 0 },
              { weekday: 6, completion: null, sampleSize: 0 },
              { weekday: 7, completion: null, sampleSize: 0 },
            ],
            areas: [],
            attentionHabits: [],
            focusZones: null,
            availableCategories: [],
            trend: [],
            habits: [],
            analytics: {
              from: '2026-09-01',
              to: '2026-09-30',
              previousFrom: '2026-08-01',
              previousTo: '2026-08-31',
              timezone: 'Asia/Tashkent',
              monthOverMonth: {
                currentCompletion: 0,
                previousCompletion: 0,
                delta: 0,
                currentScheduled: 0,
                previousScheduled: 0,
              },
              mostBroken: null,
              bestWeekday: null,
              bestTime: null,
              correlations: [],
              insights: [],
              recommendations: [],
            },
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
