import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalGrowthReviewsPage } from './PersonalGrowthReviewsPage';

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

const METRICS = {
  studyMinutes: 120,
  focusMinutes: 180,
  tasksCompleted: 12,
  habitCheckIns: 6,
  dailyGoalsDone: 4,
  xpEarned: 240,
  currentStreak: 5,
  bestStreak: 12,
  levelStart: 3,
  levelEnd: 4,
  finance: { incomeSom: 150000, expenseSom: 47000, netSom: 103000 },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PersonalGrowthReviewsPage', () => {
  it('shows weekly metrics on 390px', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/growth/reviews/weekly': {
        status: 200,
        body: {
          success: true,
          data: {
            weekStartDayKey: '2026-09-14',
            weekEndDayKey: '2026-09-20',
            metrics: METRICS,
            reflection: {
              wentWell: null,
              wasHard: null,
              nextWeekChange: null,
              updatedAt: null,
            },
          },
        },
      },
      '/personal/growth/reports/monthly': {
        status: 200,
        body: {
          success: true,
          data: {
            yearMonth: '2026-09',
            startDayKey: '2026-09-01',
            endDayKey: '2026-09-30',
            metrics: METRICS,
            reflection: {
              highlight: null,
              lesson: null,
              nextMonthIntent: null,
              updatedAt: null,
            },
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalGrowthReviewsPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByText('2026-09-14 — 2026-09-20')).toBeInTheDocument();
    expect(screen.getByText('+240')).toBeInTheDocument();
  });
});
