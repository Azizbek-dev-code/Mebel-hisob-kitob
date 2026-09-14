import {
  SubscriptionStatus,
  WorkspaceType,
  effectiveSubscriptionStatus,
  type PersonalPlatformStatsResponse,
} from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { getOnboardingStats } from '../onboarding/onboarding.service.js';

/**
 * Platform counts only. Never selects personal entry amounts or custom income.
 */
export async function getPersonalPlatformStats(
  db: PrismaClient = defaultPrisma,
): Promise<PersonalPlatformStatsResponse> {
  const [workspaces, subscriptions, entryGroups, budgetGroups, goalGroups, onboarding] =
    await Promise.all([
      db.workspace.count({ where: { type: WorkspaceType.PERSONAL } }),
      db.personalSubscription.findMany({
        select: {
          status: true,
          trialEndsAt: true,
          currentPeriodEnd: true,
        },
      }),
      db.personalEntry.groupBy({
        by: ['workspaceId'],
        _count: { _all: true },
      }),
      db.personalBudget.groupBy({
        by: ['workspaceId'],
        where: { isActive: true },
        _count: { _all: true },
      }),
      db.personalSavingGoal.groupBy({
        by: ['workspaceId'],
        _count: { _all: true },
      }),
      getOnboardingStats(db),
    ]);

  const stats: PersonalPlatformStatsResponse = {
    workspaces,
    trial: 0,
    active: 0,
    expired: 0,
    cancelled: 0,
    withEntries: entryGroups.length,
    withBudgets: budgetGroups.length,
    withSavingGoals: goalGroups.length,
    onboarding: {
      started: onboarding.started,
      completed: onboarding.completed,
      discoverySource: onboarding.discoverySource,
      goals: onboarding.goals,
      helpWith: onboarding.helpWith,
      monthlyIncomeBand: onboarding.monthlyIncomeBand,
      customIncomeEnteredCount: onboarding.customIncomeEnteredCount,
    },
  };

  for (const row of subscriptions) {
    const effective = effectiveSubscriptionStatus(row);
    if (effective === SubscriptionStatus.TRIAL) stats.trial += 1;
    else if (effective === SubscriptionStatus.ACTIVE) stats.active += 1;
    else if (effective === SubscriptionStatus.CANCELLED) stats.cancelled += 1;
    else stats.expired += 1;
  }

  return stats;
}
