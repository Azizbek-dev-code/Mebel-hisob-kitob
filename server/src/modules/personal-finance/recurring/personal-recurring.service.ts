import {
  AuditEntityType,
  AuditEventType,
  GrowthXpSource,
  PersonalCategoryKind,
  PersonalEntryType,
  WorkspaceStatus,
  WorkspaceType,
  XP_FINANCE_RECURRING,
  advanceRecurringDue,
  recurringDueState,
  type CreatePersonalRecurringRuleRequest,
  type PersonalRecurringRuleDto,
  type UpdatePersonalRecurringRuleRequest,
} from '@furniture-erp/shared';
import type { Prisma, PrismaClient } from '@prisma/client';

import { parseFlexibleDate } from '../../../lib/date-input.js';
import { fromDbMoney, toDbMoney } from '../../../lib/money-mapper.js';
import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';
import { ApiError } from '../../../utils/api-error.js';
import { tryAwardXp } from '../growth/personal-growth-xp.service.js';
import { createPersonalEntry } from '../ledger/personal-ledger.service.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

const ruleInclude = {
  wallet: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
} satisfies Prisma.PersonalRecurringRuleInclude;

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

function toRuleDto(
  row: Prisma.PersonalRecurringRuleGetPayload<{ include: typeof ruleInclude }>,
  now = new Date(),
): PersonalRecurringRuleDto {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amountSom: fromDbMoney(row.amountSom),
    frequency: row.frequency,
    intervalDays: row.intervalDays,
    dayOfMonth: row.dayOfMonth,
    nextDueAt: row.nextDueAt.toISOString(),
    dueState: recurringDueState(row.nextDueAt, now),
    note: row.note,
    isActive: row.isActive,
    wallet: row.wallet,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadRule(workspaceId: string, id: string, db: DbClient) {
  const row = await db.personalRecurringRule.findFirst({
    where: { id, workspaceId },
    include: ruleInclude,
  });
  if (!row) throw ApiError.notFound('Takroriy to‘lov topilmadi');
  return row;
}

async function optionalWallet(workspaceId: string, walletId: string | null | undefined, db: DbClient) {
  if (!walletId) return null;
  const wallet = await db.personalWallet.findFirst({ where: { id: walletId, workspaceId } });
  if (!wallet || wallet.isArchived) {
    throw ApiError.validation('Hisobni tanlang', [{ field: 'walletId', message: 'Hisob topilmadi' }]);
  }
  return wallet.id;
}

async function optionalCategory(
  workspaceId: string,
  categoryId: string | null | undefined,
  type: PersonalEntryType,
  db: DbClient,
) {
  if (!categoryId) return null;
  const category = await db.personalCategory.findFirst({ where: { id: categoryId, workspaceId } });
  if (!category || !category.isActive) {
    throw ApiError.validation('Kategoriyani tanlang', [{ field: 'categoryId', message: 'Kategoriya topilmadi' }]);
  }
  const expectedKind =
    type === PersonalEntryType.INCOME ? PersonalCategoryKind.INCOME : PersonalCategoryKind.EXPENSE;
  if (category.kind !== expectedKind) {
    throw ApiError.validation('Kategoriya turi mos emas', [
      { field: 'categoryId', message: 'Kategoriya yozuv turiga mos kelishi kerak' },
    ]);
  }
  return category.id;
}

function resolveDayOfMonth(
  frequency: PersonalRecurringRuleDto['frequency'],
  dayOfMonth: number | null | undefined,
  nextDueAt: Date,
): number | null {
  if (frequency === 'MONTHLY' || frequency === 'YEARLY') {
    return dayOfMonth ?? nextDueAt.getUTCDate();
  }
  return dayOfMonth ?? null;
}

export async function listPersonalRecurringRules(
  workspaceId: string,
  db: PrismaClient = defaultPrisma,
  now = new Date(),
): Promise<{ items: PersonalRecurringRuleDto[]; upcoming: PersonalRecurringRuleDto[] }> {
  await assertPersonalWorkspace(workspaceId, db);
  const rows = await db.personalRecurringRule.findMany({
    where: { workspaceId },
    include: ruleInclude,
    orderBy: [{ isActive: 'desc' }, { nextDueAt: 'asc' }],
  });
  const items = rows.map((row) => toRuleDto(row, now));
  const upcoming = items.filter(
    (item) => item.isActive && item.dueState !== 'LATER',
  );
  return { items, upcoming };
}

export async function createPersonalRecurringRule(
  workspaceId: string,
  identityId: string,
  input: CreatePersonalRecurringRuleRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalRecurringRuleDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const nextDueAt = parseFlexibleDate(input.nextDueAt);
  if (!nextDueAt) {
    throw ApiError.validation('Sanani kiriting', [{ field: 'nextDueAt', message: 'Sana noto‘g‘ri' }]);
  }
  const walletId = await optionalWallet(workspaceId, input.walletId, db);
  const categoryId = await optionalCategory(workspaceId, input.categoryId, input.type, db);
  const row = await db.personalRecurringRule.create({
    data: {
      workspaceId,
      name: input.name.trim(),
      type: input.type,
      amountSom: toDbMoney(input.amountSom),
      frequency: input.frequency,
      intervalDays: input.frequency === 'CUSTOM' ? input.intervalDays ?? null : null,
      dayOfMonth: resolveDayOfMonth(input.frequency, input.dayOfMonth, nextDueAt),
      nextDueAt,
      walletId,
      categoryId,
      note: input.note?.trim() || null,
    },
    include: ruleInclude,
  });
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_RECURRING_CREATED,
    entityType: AuditEntityType.PERSONAL_RECURRING_RULE,
    entityId: row.id,
    summary: `Personal recurring reminder created: ${row.name}`,
    metadata: { workspaceId, identityId, frequency: row.frequency },
  });
  await tryAwardXp({
    workspaceId,
    identityId,
    source: GrowthXpSource.FINANCE_DISCIPLINE,
    sourceEntityId: `finance-recurring:${row.id}`,
    amount: XP_FINANCE_RECURRING,
    summary: 'Recurring reminder created',
  });
  return toRuleDto(row);
}

export async function updatePersonalRecurringRule(
  workspaceId: string,
  identityId: string,
  id: string,
  input: UpdatePersonalRecurringRuleRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalRecurringRuleDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const existing = await loadRule(workspaceId, id, db);
  const nextDueAt =
    input.nextDueAt === undefined ? existing.nextDueAt : parseFlexibleDate(input.nextDueAt);
  if (!nextDueAt) {
    throw ApiError.validation('Sanani kiriting', [{ field: 'nextDueAt', message: 'Sana noto‘g‘ri' }]);
  }
  const frequency = input.frequency ?? existing.frequency;
  const type = existing.type;
  const walletId =
    input.walletId === undefined ? existing.walletId : await optionalWallet(workspaceId, input.walletId, db);
  const categoryId =
    input.categoryId === undefined
      ? existing.categoryId
      : await optionalCategory(workspaceId, input.categoryId, type, db);
  const row = await db.personalRecurringRule.update({
    where: { id: existing.id },
    data: {
      name: input.name?.trim() ?? existing.name,
      amountSom: input.amountSom === undefined ? undefined : toDbMoney(input.amountSom),
      frequency,
      intervalDays: frequency === 'CUSTOM' ? input.intervalDays ?? existing.intervalDays : null,
      dayOfMonth: resolveDayOfMonth(frequency, input.dayOfMonth ?? existing.dayOfMonth, nextDueAt),
      nextDueAt,
      walletId,
      categoryId,
      note: input.note === undefined ? undefined : input.note?.trim() || null,
      isActive: input.isActive,
    },
    include: ruleInclude,
  });
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_RECURRING_UPDATED,
    entityType: AuditEntityType.PERSONAL_RECURRING_RULE,
    entityId: row.id,
    summary: `Personal recurring reminder updated: ${row.name}`,
    metadata: { workspaceId, identityId },
  });
  return toRuleDto(row);
}

async function advanceRule(
  workspaceId: string,
  identityId: string,
  id: string,
  db: PrismaClient,
): Promise<PersonalRecurringRuleDto> {
  const existing = await loadRule(workspaceId, id, db);
  if (!existing.isActive) throw ApiError.conflict('Yashirilgan eslatmani o‘tkazib bo‘lmaydi');
  const nextDueAt = advanceRecurringDue({
    frequency: existing.frequency,
    intervalDays: existing.intervalDays,
    dayOfMonth: existing.dayOfMonth,
    from: existing.nextDueAt,
  });
  const row = await db.personalRecurringRule.update({
    where: { id: existing.id },
    data: { nextDueAt },
    include: ruleInclude,
  });
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_RECURRING_ACKNOWLEDGED,
    entityType: AuditEntityType.PERSONAL_RECURRING_RULE,
    entityId: row.id,
    summary: `Personal recurring reminder advanced: ${row.name}`,
    metadata: { workspaceId, identityId, nextDueAt: nextDueAt.toISOString() },
  });
  return toRuleDto(row);
}

/** Skip this occurrence. Does not write income/expense. */
export async function acknowledgePersonalRecurringRule(
  workspaceId: string,
  identityId: string,
  id: string,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalRecurringRuleDto> {
  await assertPersonalWorkspace(workspaceId, db);
  return advanceRule(workspaceId, identityId, id, db);
}

/**
 * User chose to record the reminder as a ledger row, then the next due date
 * moves forward. Not an automatic payment.
 */
export async function logPersonalRecurringRule(
  workspaceId: string,
  identityId: string,
  id: string,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalRecurringRuleDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const existing = await loadRule(workspaceId, id, db);
  if (!existing.walletId || !existing.categoryId) {
    throw ApiError.validation('Hisob va kategoriya kerak', [
      { field: 'walletId', message: 'Yozuv uchun hisob va kategoriya tanlang' },
    ]);
  }
  await createPersonalEntry(
    workspaceId,
    identityId,
    {
      type: existing.type,
      amount: fromDbMoney(existing.amountSom),
      occurredAt: existing.nextDueAt.toISOString(),
      walletId: existing.walletId,
      categoryId: existing.categoryId,
      note: existing.note ?? existing.name,
    },
    db,
  );
  return advanceRule(workspaceId, identityId, id, db);
}
