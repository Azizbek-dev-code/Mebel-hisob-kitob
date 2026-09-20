import {
  AuditEntityType,
  AuditEventType,
  GrowthXpSource,
  WorkspaceStatus,
  WorkspaceType,
  XP_FINANCE_DEBT_LOG,
  personalDebtRemaining,
  personalDebtStatus,
  type CreatePersonalDebtPaymentRequest,
  type CreatePersonalDebtRequest,
  type PersonalDebtDto,
  type PersonalDebtListResponse,
  type PersonalDebtPaymentDto,
  type UpdatePersonalDebtRequest,
} from '@furniture-erp/shared';
import type { Prisma, PrismaClient } from '@prisma/client';

import { parseFlexibleDate, parseFlexibleDateOrNull } from '../../../lib/date-input.js';
import { fromDbMoney, toDbMoney } from '../../../lib/money-mapper.js';
import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';
import { ApiError } from '../../../utils/api-error.js';
import { tryAwardXp } from '../growth/personal-growth-xp.service.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

const debtInclude = {
  payments: { orderBy: { occurredAt: 'desc' as const } },
} satisfies Prisma.PersonalDebtInclude;

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

function toPaymentDto(row: {
  id: string;
  amountSom: bigint;
  occurredAt: Date;
  note: string | null;
  createdAt: Date;
}): PersonalDebtPaymentDto {
  return {
    id: row.id,
    amountSom: fromDbMoney(row.amountSom),
    occurredAt: row.occurredAt.toISOString(),
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDebtDto(
  row: Prisma.PersonalDebtGetPayload<{ include: typeof debtInclude }>,
  now = new Date(),
): PersonalDebtDto {
  const principalSom = fromDbMoney(row.principalSom);
  const paidSom = row.payments.reduce((sum, payment) => sum + fromDbMoney(payment.amountSom), 0);
  return {
    id: row.id,
    direction: row.direction,
    personName: row.personName,
    principalSom,
    paidSom,
    remainingSom: personalDebtRemaining(principalSom, paidSom),
    occurredAt: row.occurredAt.toISOString(),
    dueAt: row.dueAt?.toISOString() ?? null,
    note: row.note,
    status: personalDebtStatus(principalSom, paidSom, row.dueAt, now),
    isArchived: row.isArchived,
    payments: row.payments.map(toPaymentDto),
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadDebt(workspaceId: string, id: string, db: DbClient) {
  const row = await db.personalDebt.findFirst({
    where: { id, workspaceId },
    include: debtInclude,
  });
  if (!row) throw ApiError.notFound('Qarz topilmadi');
  return row;
}

export async function listPersonalDebts(
  workspaceId: string,
  db: PrismaClient = defaultPrisma,
  now = new Date(),
): Promise<PersonalDebtListResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const rows = await db.personalDebt.findMany({
    where: { workspaceId },
    include: debtInclude,
    orderBy: [{ isArchived: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
  });
  const items = rows.map((row) => toDebtDto(row, now));
  const open = items.filter((item) => !item.isArchived && item.status !== 'PAID');
  return {
    items,
    lentOutstandingSom: open
      .filter((item) => item.direction === 'LENT')
      .reduce((sum, item) => sum + item.remainingSom, 0),
    borrowedOutstandingSom: open
      .filter((item) => item.direction === 'BORROWED')
      .reduce((sum, item) => sum + item.remainingSom, 0),
  };
}

export async function createPersonalDebt(
  workspaceId: string,
  identityId: string,
  input: CreatePersonalDebtRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalDebtDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const occurredAt = parseFlexibleDate(input.occurredAt);
  if (!occurredAt) {
    throw ApiError.validation('Sanani kiriting', [{ field: 'occurredAt', message: 'Sana noto‘g‘ri' }]);
  }
  const dueAt = parseFlexibleDateOrNull(input.dueAt ?? null);
  const row = await db.personalDebt.create({
    data: {
      workspaceId,
      direction: input.direction,
      personName: input.personName.trim(),
      principalSom: toDbMoney(input.principalSom),
      occurredAt,
      dueAt: dueAt ?? null,
      note: input.note?.trim() || null,
    },
    include: debtInclude,
  });
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_DEBT_CREATED,
    entityType: AuditEntityType.PERSONAL_DEBT,
    entityId: row.id,
    summary: `Personal debt recorded: ${row.personName}`,
    metadata: { workspaceId, identityId, direction: row.direction },
  });
  await tryAwardXp({
    workspaceId,
    identityId,
    source: GrowthXpSource.FINANCE_DISCIPLINE,
    sourceEntityId: `finance-debt:${row.id}`,
    amount: XP_FINANCE_DEBT_LOG,
    summary: 'Debt recorded',
  });
  return toDebtDto(row);
}

export async function updatePersonalDebt(
  workspaceId: string,
  identityId: string,
  id: string,
  input: UpdatePersonalDebtRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalDebtDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const existing = await loadDebt(workspaceId, id, db);
  const dueAt = input.dueAt === undefined ? existing.dueAt : (parseFlexibleDateOrNull(input.dueAt) ?? null);
  const row = await db.personalDebt.update({
    where: { id: existing.id },
    data: {
      personName: input.personName?.trim(),
      dueAt,
      note: input.note === undefined ? undefined : input.note?.trim() || null,
      isArchived: input.isArchived,
    },
    include: debtInclude,
  });
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_DEBT_UPDATED,
    entityType: AuditEntityType.PERSONAL_DEBT,
    entityId: row.id,
    summary: `Personal debt updated: ${row.personName}`,
    metadata: { workspaceId, identityId },
  });
  return toDebtDto(row);
}

export async function addPersonalDebtPayment(
  workspaceId: string,
  identityId: string,
  id: string,
  input: CreatePersonalDebtPaymentRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalDebtDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const existing = await loadDebt(workspaceId, id, db);
  const dto = toDebtDto(existing);
  if (dto.remainingSom <= 0) throw ApiError.conflict('Qarz allaqachon yopilgan');
  if (input.amountSom > dto.remainingSom) {
    throw ApiError.validation('Summa qolgan qarzdan katta', [
      { field: 'amountSom', message: 'Qolgan summadan oshmasin' },
    ]);
  }
  const occurredAt = parseFlexibleDate(input.occurredAt);
  if (!occurredAt) {
    throw ApiError.validation('Sanani kiriting', [{ field: 'occurredAt', message: 'Sana noto‘g‘ri' }]);
  }
  await db.personalDebtPayment.create({
    data: {
      debtId: existing.id,
      amountSom: toDbMoney(input.amountSom),
      occurredAt,
      note: input.note?.trim() || null,
    },
  });
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_DEBT_PAYMENT_CREATED,
    entityType: AuditEntityType.PERSONAL_DEBT,
    entityId: existing.id,
    summary: `Personal debt payment: ${existing.personName}`,
    metadata: { workspaceId, identityId, amountSom: input.amountSom },
  });
  const updated = await loadDebt(workspaceId, id, db);
  return toDebtDto(updated);
}
