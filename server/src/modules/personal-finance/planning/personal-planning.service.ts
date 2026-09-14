import {
  AuditEntityType,
  AuditEventType,
  ExpenseStatus,
  PersonalBudgetKind,
  PersonalCategoryKind,
  PersonalEntryType,
  PersonalSavingGoalStatus,
  WorkspaceStatus,
  WorkspaceType,
  budgetProgress,
  projectGoal,
  type CreatePersonalBudgetRequest,
  type CreatePersonalGoalContributionRequest,
  type CreatePersonalSavingGoalRequest,
  type PersonalBudgetDto,
  type PersonalGoalContributionDto,
  type PersonalSavingGoalDto,
  type UpdatePersonalBudgetRequest,
  type UpdatePersonalSavingGoalRequest,
} from '@furniture-erp/shared';
import type { Prisma, PrismaClient } from '@prisma/client';

import { parseFlexibleDate } from '../../../lib/date-input.js';
import { fromDbMoney, fromDbMoneySum, toDbMoney } from '../../../lib/money-mapper.js';
import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';
import { ApiError } from '../../../utils/api-error.js';
import { ensurePersonalLedger } from '../ledger/personal-ledger.service.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

function monthBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

async function assertPersonalWorkspace(workspaceId: string, db: DbClient): Promise<void> {
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

function isUniqueConflict(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002');
}

async function monthSpentSom(
  workspaceId: string,
  categoryId: string | null,
  db: DbClient,
  now = new Date(),
): Promise<number> {
  const { start, end } = monthBounds(now);
  const grouped = await db.personalEntry.aggregate({
    where: {
      workspaceId,
      status: ExpenseStatus.ACTIVE,
      type: PersonalEntryType.EXPENSE,
      occurredAt: { gte: start, lte: end },
      ...(categoryId ? { categoryId } : {}),
    },
    _sum: { amount: true },
  });
  return fromDbMoneySum(grouped._sum.amount);
}

function toBudgetDto(
  row: {
    id: string;
    kind: PersonalBudgetDto['kind'];
    name: string;
    limitSom: bigint;
    isActive: boolean;
    createdAt: Date;
    category: { id: string; name: string } | null;
  },
  spentSom: number,
  period: { start: Date; end: Date },
): PersonalBudgetDto {
  const limitSom = fromDbMoney(row.limitSom);
  const progress = budgetProgress(limitSom, spentSom);
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    limitSom,
    spentSom,
    remainingSom: progress.remainingSom,
    percent: progress.percent,
    overspentSom: progress.overspentSom,
    warningLevel: progress.warningLevel,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    isActive: row.isActive,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
  };
}

function toContributionDto(row: {
  id: string;
  amountSom: bigint;
  occurredAt: Date;
  note: string | null;
  createdAt: Date;
}): PersonalGoalContributionDto {
  return {
    id: row.id,
    amount: fromDbMoney(row.amountSom),
    occurredAt: row.occurredAt.toISOString(),
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

function toGoalDto(
  row: {
    id: string;
    name: string;
    targetAmountSom: bigint;
    targetDate: Date | null;
    monthlyContributionSom: bigint | null;
    status: PersonalSavingGoalDto['status'];
    createdAt: Date;
    contributions: {
      id: string;
      amountSom: bigint;
      occurredAt: Date;
      note: string | null;
      createdAt: Date;
    }[];
  },
  now = new Date(),
): PersonalSavingGoalDto {
  const targetSom = fromDbMoney(row.targetAmountSom);
  const savedSom = row.contributions.reduce((sum, item) => sum + fromDbMoney(item.amountSom), 0);
  const remainingSom = targetSom - savedSom;
  const percent = targetSom <= 0 ? 0 : Math.round((savedSom / targetSom) * 100);
  const first = row.contributions.reduce<Date | null>((earliest, item) => {
    if (!earliest || item.occurredAt < earliest) return item.occurredAt;
    return earliest;
  }, null);
  const monthlyContributionSom =
    row.monthlyContributionSom == null ? null : fromDbMoney(row.monthlyContributionSom);
  const projection = projectGoal({
    targetSom,
    savedSom,
    monthlyContributionSom,
    targetDate: row.targetDate,
    firstContributionAt: first,
    now,
  });
  return {
    id: row.id,
    name: row.name,
    targetSom,
    savedSom,
    remainingSom,
    percent,
    targetDate: row.targetDate?.toISOString() ?? null,
    monthlyContributionSom,
    requiredMonthlySom: projection.requiredMonthlySom,
    estimatedReachAt: projection.estimatedReachAt,
    etaKind: projection.etaKind,
    onTrack: projection.onTrack,
    status: row.status,
    contributions: [...row.contributions]
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .map(toContributionDto),
    createdAt: row.createdAt.toISOString(),
  };
}

const budgetInclude = {
  category: { select: { id: true, name: true } },
} as const;

const goalInclude = {
  contributions: { orderBy: { occurredAt: 'desc' as const } },
} as const;

export async function listPersonalBudgets(
  workspaceId: string,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalBudgetDto[]> {
  await assertPersonalWorkspace(workspaceId, db);
  await ensurePersonalLedger(workspaceId, db);
  const period = monthBounds();
  const rows = await db.personalBudget.findMany({
    where: { workspaceId },
    include: budgetInclude,
    orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
  });
  const items: PersonalBudgetDto[] = [];
  for (const row of rows) {
    const spentSom = await monthSpentSom(
      workspaceId,
      row.kind === PersonalBudgetKind.CATEGORY ? row.categoryId : null,
      db,
    );
    items.push(toBudgetDto(row, spentSom, period));
  }
  return items;
}

export async function createPersonalBudget(
  workspaceId: string,
  identityId: string,
  input: CreatePersonalBudgetRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalBudgetDto> {
  await assertPersonalWorkspace(workspaceId, db);
  await ensurePersonalLedger(workspaceId, db);
  const name = input.name.trim();
  if (name.length < 2) {
    throw ApiError.validation('Budjet nomini kiriting', [{ field: 'name', message: 'Kamida 2 belgi' }]);
  }

  let categoryId: string | null = null;
  if (input.kind === PersonalBudgetKind.CATEGORY) {
    if (!input.categoryId) {
      throw ApiError.validation('Kategoriyani tanlang', [
        { field: 'categoryId', message: 'Kategoriya majburiy' },
      ]);
    }
    const category = await db.personalCategory.findFirst({
      where: { id: input.categoryId, workspaceId },
    });
    if (!category || category.kind !== PersonalCategoryKind.EXPENSE || !category.isActive) {
      throw ApiError.validation('Kategoriyani tanlang', [
        { field: 'categoryId', message: 'Faqat faol xarajat kategoriyasi' },
      ]);
    }
    categoryId = category.id;
  }

  try {
    const row = await db.personalBudget.create({
      data: {
        workspaceId,
        kind: input.kind,
        categoryId,
        name,
        limitSom: toDbMoney(input.limitSom),
      },
      include: budgetInclude,
    });
    await recordAudit({
      storeId: null,
      actorUserId: null,
      eventType: AuditEventType.PERSONAL_BUDGET_CREATED,
      entityType: AuditEntityType.PERSONAL_BUDGET,
      entityId: row.id,
      summary: `Personal budget created: ${row.name}`,
      metadata: { workspaceId, identityId, kind: row.kind },
    });
    const spentSom = await monthSpentSom(workspaceId, categoryId, db);
    return toBudgetDto(row, spentSom, monthBounds());
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw ApiError.conflict('Bu budjet allaqachon bor');
    }
    throw error;
  }
}

export async function updatePersonalBudget(
  workspaceId: string,
  budgetId: string,
  identityId: string,
  input: UpdatePersonalBudgetRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalBudgetDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const existing = await db.personalBudget.findFirst({
    where: { id: budgetId, workspaceId },
    include: budgetInclude,
  });
  if (!existing) throw ApiError.notFound('Budjet topilmadi');

  const data: Prisma.PersonalBudgetUpdateInput = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) {
      throw ApiError.validation('Budjet nomini kiriting', [{ field: 'name', message: 'Kamida 2 belgi' }]);
    }
    data.name = name;
  }
  if (input.limitSom !== undefined) data.limitSom = toDbMoney(input.limitSom);
  if (input.isActive !== undefined) data.isActive = input.isActive;

  try {
    const row = await db.personalBudget.update({
      where: { id: budgetId },
      data,
      include: budgetInclude,
    });
    await recordAudit({
      storeId: null,
      actorUserId: null,
      eventType: AuditEventType.PERSONAL_BUDGET_UPDATED,
      entityType: AuditEntityType.PERSONAL_BUDGET,
      entityId: row.id,
      summary: `Personal budget updated: ${row.name}`,
      metadata: { workspaceId, identityId },
    });
    const spentSom = await monthSpentSom(
      workspaceId,
      row.kind === PersonalBudgetKind.CATEGORY ? row.categoryId : null,
      db,
    );
    return toBudgetDto(row, spentSom, monthBounds());
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw ApiError.conflict('Bu budjet allaqachon bor');
    }
    throw error;
  }
}

export async function listPersonalSavingGoals(
  workspaceId: string,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalSavingGoalDto[]> {
  await assertPersonalWorkspace(workspaceId, db);
  const rows = await db.personalSavingGoal.findMany({
    where: { workspaceId },
    include: goalInclude,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
  return rows.map((row) => toGoalDto(row));
}

export async function createPersonalSavingGoal(
  workspaceId: string,
  identityId: string,
  input: CreatePersonalSavingGoalRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalSavingGoalDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const name = input.name.trim();
  if (name.length < 2) {
    throw ApiError.validation('Maqsad nomini kiriting', [{ field: 'name', message: 'Kamida 2 belgi' }]);
  }
  const targetDate =
    input.targetDate === undefined || input.targetDate === null
      ? null
      : parseFlexibleDate(input.targetDate);
  if (input.targetDate && !targetDate) {
    throw ApiError.validation('Sanani kiriting', [{ field: 'targetDate', message: 'Sana noto‘g‘ri' }]);
  }
  const monthlyContributionSom =
    input.monthlyContributionSom != null && input.monthlyContributionSom > 0
      ? toDbMoney(input.monthlyContributionSom)
      : null;

  const row = await db.personalSavingGoal.create({
    data: {
      workspaceId,
      name,
      targetAmountSom: toDbMoney(input.targetSom),
      targetDate,
      monthlyContributionSom,
    },
    include: goalInclude,
  });
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_GOAL_CREATED,
    entityType: AuditEntityType.PERSONAL_SAVING_GOAL,
    entityId: row.id,
    summary: `Personal saving goal created: ${row.name}`,
    metadata: { workspaceId, identityId },
  });
  return toGoalDto(row);
}

export async function updatePersonalSavingGoal(
  workspaceId: string,
  goalId: string,
  identityId: string,
  input: UpdatePersonalSavingGoalRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalSavingGoalDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const existing = await db.personalSavingGoal.findFirst({
    where: { id: goalId, workspaceId },
    include: goalInclude,
  });
  if (!existing) throw ApiError.notFound('Maqsad topilmadi');

  const data: Prisma.PersonalSavingGoalUpdateInput = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) {
      throw ApiError.validation('Maqsad nomini kiriting', [{ field: 'name', message: 'Kamida 2 belgi' }]);
    }
    data.name = name;
  }
  if (input.targetSom !== undefined) data.targetAmountSom = toDbMoney(input.targetSom);
  if (input.targetDate !== undefined) {
    if (input.targetDate === null) data.targetDate = null;
    else {
      const targetDate = parseFlexibleDate(input.targetDate);
      if (!targetDate) {
        throw ApiError.validation('Sanani kiriting', [{ field: 'targetDate', message: 'Sana noto‘g‘ri' }]);
      }
      data.targetDate = targetDate;
    }
  }
  if (input.status !== undefined) data.status = input.status;
  if (input.monthlyContributionSom !== undefined) {
    data.monthlyContributionSom =
      input.monthlyContributionSom != null && input.monthlyContributionSom > 0
        ? toDbMoney(input.monthlyContributionSom)
        : null;
  }

  const row = await db.personalSavingGoal.update({
    where: { id: goalId },
    data,
    include: goalInclude,
  });
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_GOAL_UPDATED,
    entityType: AuditEntityType.PERSONAL_SAVING_GOAL,
    entityId: row.id,
    summary: `Personal saving goal updated: ${row.name}`,
    metadata: { workspaceId, identityId },
  });
  return toGoalDto(row);
}

export async function addPersonalGoalContribution(
  workspaceId: string,
  goalId: string,
  identityId: string,
  input: CreatePersonalGoalContributionRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalSavingGoalDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const existing = await db.personalSavingGoal.findFirst({
    where: { id: goalId, workspaceId },
    include: goalInclude,
  });
  if (!existing) throw ApiError.notFound('Maqsad topilmadi');
  if (existing.status !== PersonalSavingGoalStatus.ACTIVE) {
    throw ApiError.conflict('Faqat faol maqsadga to‘lov qo‘shiladi');
  }
  const occurredAt = parseFlexibleDate(input.occurredAt);
  if (!occurredAt) {
    throw ApiError.validation('Sanani kiriting', [{ field: 'occurredAt', message: 'Sana noto‘g‘ri' }]);
  }

  await db.personalGoalContribution.create({
    data: {
      goalId,
      amountSom: toDbMoney(input.amount),
      occurredAt,
      note: input.note?.trim() || null,
    },
  });

  const row = await db.personalSavingGoal.findFirstOrThrow({
    where: { id: goalId, workspaceId },
    include: goalInclude,
  });
  const savedSom = row.contributions.reduce((sum, item) => sum + fromDbMoney(item.amountSom), 0);
  const targetSom = fromDbMoney(row.targetAmountSom);
  const completed =
    savedSom >= targetSom
      ? await db.personalSavingGoal.update({
          where: { id: goalId },
          data: { status: PersonalSavingGoalStatus.COMPLETED },
          include: goalInclude,
        })
      : row;

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_GOAL_CONTRIBUTION_CREATED,
    entityType: AuditEntityType.PERSONAL_SAVING_GOAL,
    entityId: goalId,
    summary: `Personal goal contribution recorded`,
    metadata: { workspaceId, identityId, amount: input.amount },
  });
  return toGoalDto(completed);
}
