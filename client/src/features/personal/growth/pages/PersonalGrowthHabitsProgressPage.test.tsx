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

const PROGRESS = {
  period: 'CUSTOM',
  from: '2026-08-21',
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
  dayPerformance: [
    {
      dayKey: '2026-09-16',
      scheduledCount: 0,
      completedCount: 0,
      progressedCount: 0,
      rate: null,
    },
    {
      dayKey: '2026-09-17',
      scheduledCount: 5,
      completedCount: 4,
      progressedCount: 4,
      rate: 0.8,
    },
  ],
  performanceBreakdown: { full: 12, partial: 9, missed: 5, noPlan: 2 },
  weeklyRhythm: [
    { weekday: 1, completion: 0.82, sampleSize: 5 },
    { weekday: 2, completion: 0.91, sampleSize: 5 },
    { weekday: 3, completion: 0.64, sampleSize: 5 },
    { weekday: 4, completion: 0.88, sampleSize: 5 },
    { weekday: 5, completion: 0.75, sampleSize: 5 },
    { weekday: 6, completion: null, sampleSize: 0 },
    { weekday: 7, completion: 0.57, sampleSize: 4 },
  ],
  areas: [
    {
      category: 'reading',
      habitCount: 1,
      completed: 8,
      scheduled: 10,
      consistency: 0.8,
    },
  ],
  attentionHabits: [{ habitId: 'habit_1', title: '20 English words', missed: 2 }],
  focusZones: null,
  availableCategories: ['reading'],
  trend: [{ key: '2026-W38', label: '2026-W38', completion: 0.8, value: 5 }],
  habits: [
    {
      habitId: 'habit_1',
      title: '20 English words',
      kind: 'GOOD',
      icon: 'flame',
      color: '#4f46e5',
      category: 'reading',
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
    from: '2026-08-21',
    to: '2026-09-17',
    previousFrom: '2026-07-24',
    previousTo: '2026-08-20',
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
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PersonalGrowthHabitsProgressPage', () => {
  it('shows taraqqiyot hero, heatmap and habit analytics', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/growth/habits': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [],
            todayKey: '2026-09-17',
            viewDayKey: '2026-09-17',
          },
        },
      },
      '/personal/growth/habits/progress': {
        status: 200,
        body: { success: true, data: PROGRESS },
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
    expect(await screen.findByText('Umumiy izchillik')).toBeInTheDocument();
    expect(screen.getAllByText('20 English words').length).toBeGreaterThan(0);
    expect(screen.getByText('To‘liq')).toBeInTheDocument();
    expect(screen.getByText(/Bajarilish oshdi/)).toBeInTheDocument();
    expect(screen.getByText(/↑ 20%/)).toBeInTheDocument();
  });
});
