import { SubscriptionStatus, WorkspaceType } from '@furniture-erp/shared';

import { beforeEach, describe, expect, it, vi } from 'vitest';



const { prismaMock, getOnboardingStats } = vi.hoisted(() => ({

  prismaMock: {

    workspace: { count: vi.fn() },

    personalSubscription: { findMany: vi.fn() },

    personalEntry: { groupBy: vi.fn(), findMany: vi.fn(), aggregate: vi.fn() },

    personalBudget: { groupBy: vi.fn() },

    personalSavingGoal: { groupBy: vi.fn() },

  },

  getOnboardingStats: vi.fn(),

}));



vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));

vi.mock('../onboarding/onboarding.service.js', () => ({ getOnboardingStats }));



const { getPersonalPlatformStats } = await import('./personal-stats.service.js');



describe('getPersonalPlatformStats', () => {

  beforeEach(() => {

    vi.clearAllMocks();

    getOnboardingStats.mockResolvedValue({

      flowKey: 'workspace_onboarding',

      flowVersion: 1,

      started: 8,

      completed: 3,

      purpose: [],

      discoverySource: [{ key: 'TELEGRAM', count: 2 }],

      goals: [{ key: 'START_SAVING', count: 3 }],

      helpWith: [{ key: 'BUDGET', count: 1 }],

      monthlyIncomeBand: [{ key: 'FROM_1_TO_3M', count: 2 }],

      firstSavingGoal: [{ key: 'CAR', count: 1 }],

      customIncomeEnteredCount: 1,

    });

  });



  it('returns counts only and never queries personal amounts', async () => {

    prismaMock.workspace.count.mockResolvedValue(4);

    prismaMock.personalSubscription.findMany.mockResolvedValue([

      {

        status: SubscriptionStatus.TRIAL,

        trialEndsAt: new Date('2099-01-01T00:00:00.000Z'),

        currentPeriodEnd: new Date('2099-01-01T00:00:00.000Z'),

      },

      {

        status: SubscriptionStatus.ACTIVE,

        trialEndsAt: null,

        currentPeriodEnd: new Date('2099-02-01T00:00:00.000Z'),

      },

    ]);

    prismaMock.personalEntry.groupBy.mockResolvedValue([{ workspaceId: 'ws_1', _count: { _all: 4 } }]);

    prismaMock.personalBudget.groupBy.mockResolvedValue([{ workspaceId: 'ws_1', _count: { _all: 1 } }]);

    prismaMock.personalSavingGoal.groupBy.mockResolvedValue([]);



    const stats = await getPersonalPlatformStats();

    expect(stats.workspaces).toBe(4);

    expect(stats.trial).toBe(1);

    expect(stats.active).toBe(1);

    expect(stats.withEntries).toBe(1);

    expect(stats.withBudgets).toBe(1);

    expect(stats.withSavingGoals).toBe(0);

    expect(stats.onboarding.customIncomeEnteredCount).toBe(1);

    expect(stats.onboarding.discoverySource).toEqual([{ key: 'TELEGRAM', count: 2 }]);

    expect(prismaMock.workspace.count).toHaveBeenCalledWith({

      where: { type: WorkspaceType.PERSONAL },

    });

    expect(prismaMock.personalEntry.findMany).not.toHaveBeenCalled();

    expect(prismaMock.personalEntry.aggregate).not.toHaveBeenCalled();

    expect(JSON.stringify(stats)).not.toMatch(/customMonthlyIncomeSom|_sum|amountSom/i);

  });

});

