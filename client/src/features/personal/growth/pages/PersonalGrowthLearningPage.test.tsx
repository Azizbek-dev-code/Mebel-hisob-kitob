import type { PersonalAuthUser } from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PersonalGrowthLearningPage } from './PersonalGrowthLearningPage';

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

describe('PersonalGrowthLearningPage', () => {
  it('shows learning goals and study stats on 390px', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: PERSONAL } } },
      '/personal/growth/learning': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'lg_1',
                title: 'IELTS 7.0',
                description: null,
                category: 'IELTS',
                status: 'ACTIVE',
                targetValue: 7,
                targetUnit: 'score',
                currentValue: 5.5,
                deadline: '2027-01-01T00:00:00.000Z',
                totalStudyMinutes: 140,
                progressPercent: 79,
                sortOrder: 0,
                milestones: [
                  {
                    id: 'ms_1',
                    goalId: 'lg_1',
                    title: 'Mock 6.0',
                    targetValue: 6,
                    isReached: false,
                    reachedAt: null,
                    sortOrder: 0,
                  },
                ],
                createdAt: '2026-09-17T00:00:00.000Z',
                updatedAt: '2026-09-17T00:00:00.000Z',
              },
            ],
            activeCount: 1,
            todayStudyMinutes: 45,
            weekStudyMinutes: 200,
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <div className="w-[390px] overflow-x-hidden">
          <PersonalGrowthLearningPage />
        </div>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'O‘qish' })).toBeInTheDocument();
    expect(await screen.findByText('IELTS 7.0')).toBeInTheDocument();
    expect(screen.getByText('79%')).toBeInTheDocument();
    expect(screen.getByText('45m')).toBeInTheDocument();
  });
});
