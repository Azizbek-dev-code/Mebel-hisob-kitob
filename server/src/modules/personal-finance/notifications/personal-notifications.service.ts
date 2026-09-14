import {
  AuditEntityType,
  AuditEventType,
  BudgetWarningLevel,
  PersonalNotificationKind,
  PersonalNotificationSeverity,
  PersonalRecurringDueState,
  PersonalSavingGoalStatus,
  WorkspaceStatus,
  WorkspaceType,
  type PersonalNotificationDto,
  type PersonalNotificationListResponse,
  type PersonalNotificationPrefs,
  type UpdatePersonalNotificationPrefsRequest,
} from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';
import { ApiError } from '../../../utils/api-error.js';
import { listPersonalDebts } from '../debts/personal-debts.service.js';
import { listPersonalBudgets, listPersonalSavingGoals } from '../planning/personal-planning.service.js';
import { listPersonalRecurringRules } from '../recurring/personal-recurring.service.js';

const DEFAULT_PREFS: PersonalNotificationPrefs = {
  notifyBudget: true,
  notifyGoals: true,
  notifyRecurring: true,
  notifyDebts: true,
};

async function assertPersonalWorkspace(workspaceId: string, db: PrismaClient): Promise<void> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, type: true, status: true, storeId: true },
  });
  if (
    !workspace ||
    workspace.type !== WorkspaceType.PERSONAL ||
    workspace.status !== WorkspaceStatus.ACTIVE ||
    workspace.storeId !== null
  ) {
    throw ApiError.forbidden('Shaxsiy moliya ish joyi topilmadi');
  }
}

async function loadPrefs(workspaceId: string, db: PrismaClient): Promise<PersonalNotificationPrefs> {
  const profile = await db.personalProfile.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: {},
    select: {
      notifyBudget: true,
      notifyGoals: true,
      notifyRecurring: true,
      notifyDebts: true,
    },
  });
  return profile;
}

export async function listPersonalNotifications(
  workspaceId: string,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalNotificationListResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const prefs = await loadPrefs(workspaceId, db);
  const items: PersonalNotificationDto[] = [];

  if (prefs.notifyBudget) {
    const budgets = await listPersonalBudgets(workspaceId, db);
    for (const budget of budgets.filter((item) => item.isActive)) {
      if (budget.warningLevel === BudgetWarningLevel.OVER || budget.warningLevel === BudgetWarningLevel.LIMIT) {
        items.push({
          id: `budget:${budget.id}:OVER`,
          kind: PersonalNotificationKind.BUDGET_OVER,
          severity: PersonalNotificationSeverity.DANGER,
          href: '/personal/budgets',
          title: budget.name,
          amountSom: budget.overspentSom,
          dueAt: null,
        });
      } else if (budget.warningLevel === BudgetWarningLevel.NEAR) {
        items.push({
          id: `budget:${budget.id}:NEAR`,
          kind: PersonalNotificationKind.BUDGET_NEAR,
          severity: PersonalNotificationSeverity.WARNING,
          href: '/personal/budgets',
          title: budget.name,
          amountSom: budget.spentSom,
          dueAt: null,
        });
      }
    }
  }

  if (prefs.notifyRecurring) {
    const recurring = await listPersonalRecurringRules(workspaceId, db);
    for (const rule of recurring.upcoming) {
      items.push({
        id: `recurring:${rule.id}:${rule.dueState}`,
        kind:
          rule.dueState === PersonalRecurringDueState.OVERDUE
            ? PersonalNotificationKind.RECURRING_OVERDUE
            : PersonalNotificationKind.RECURRING_DUE,
        severity:
          rule.dueState === PersonalRecurringDueState.OVERDUE
            ? PersonalNotificationSeverity.DANGER
            : PersonalNotificationSeverity.WARNING,
        href: '/personal/recurring',
        title: rule.name,
        amountSom: rule.amountSom,
        dueAt: rule.nextDueAt,
      });
    }
  }

  if (prefs.notifyGoals) {
    const goals = await listPersonalSavingGoals(workspaceId, db);
    for (const goal of goals.filter((item) => item.status === PersonalSavingGoalStatus.ACTIVE)) {
      if (goal.onTrack === false) {
        items.push({
          id: `goal:${goal.id}:BEHIND`,
          kind: PersonalNotificationKind.GOAL_BEHIND,
          severity: PersonalNotificationSeverity.WARNING,
          href: '/personal/goals',
          title: goal.name,
          amountSom: goal.remainingSom,
          dueAt: goal.targetDate,
        });
      } else if (goal.targetDate) {
        const due = new Date(goal.targetDate).getTime();
        const soon = Date.now() + 14 * 24 * 60 * 60 * 1000;
        if (due <= soon) {
          items.push({
            id: `goal:${goal.id}:SOON`,
            kind: PersonalNotificationKind.GOAL_DUE_SOON,
            severity: PersonalNotificationSeverity.INFO,
            href: '/personal/goals',
            title: goal.name,
            amountSom: goal.remainingSom,
            dueAt: goal.targetDate,
          });
        }
      }
    }
  }

  if (prefs.notifyDebts) {
    const debts = await listPersonalDebts(workspaceId, db);
    for (const debt of debts.items.filter((item) => !item.isArchived && item.status === 'OVERDUE')) {
      items.push({
        id: `debt:${debt.id}:OVERDUE`,
        kind: PersonalNotificationKind.DEBT_OVERDUE,
        severity: PersonalNotificationSeverity.DANGER,
        href: '/personal/debts',
        title: debt.personName,
        amountSom: debt.remainingSom,
        dueAt: debt.dueAt,
      });
    }
  }

  const rank: Record<PersonalNotificationSeverity, number> = {
    DANGER: 0,
    WARNING: 1,
    INFO: 2,
  };
  items.sort((a, b) => rank[a.severity] - rank[b.severity] || a.title.localeCompare(b.title));
  return { items, prefs };
}

export async function updatePersonalNotificationPrefs(
  workspaceId: string,
  identityId: string,
  input: UpdatePersonalNotificationPrefsRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalNotificationPrefs> {
  await assertPersonalWorkspace(workspaceId, db);
  const current = await loadPrefs(workspaceId, db);
  const next = { ...DEFAULT_PREFS, ...current, ...input };
  const profile = await db.personalProfile.update({
    where: { workspaceId },
    data: {
      notifyBudget: next.notifyBudget,
      notifyGoals: next.notifyGoals,
      notifyRecurring: next.notifyRecurring,
      notifyDebts: next.notifyDebts,
    },
    select: {
      notifyBudget: true,
      notifyGoals: true,
      notifyRecurring: true,
      notifyDebts: true,
    },
  });
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_NOTIFICATION_PREFS_UPDATED,
    entityType: AuditEntityType.PERSONAL_PROFILE,
    entityId: workspaceId,
    summary: 'Personal notification prefs updated',
    metadata: { workspaceId, identityId },
  });
  return profile;
}
