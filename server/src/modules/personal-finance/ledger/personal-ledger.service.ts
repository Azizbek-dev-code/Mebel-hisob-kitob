import {
  AuditEntityType,
  AuditEventType,
  DEFAULT_PERSONAL_CATEGORIES,
  DEFAULT_PERSONAL_WALLETS,
  ExpenseStatus,
  GrowthXpSource,
  PersonalEntryType,
  PersonalHistoryKind,
  WorkspaceStatus,
  WorkspaceType,
  buildPaginationMeta,
  comparePersonalActivity,
  normalisePagination,
  toDayKey,
  type CreatePersonalCategoryRequest,
  type PersonalCategoryKind,
  type CreatePersonalEntryRequest,
  type CreatePersonalTransferRequest,
  type CreatePersonalWalletRequest,
  type PersonalActivityItem,
  type PersonalCategoryDto,
  type PersonalEntryDto,
  type PersonalEntryListQuery,
  type PersonalHistoryListQuery,
  type PersonalHistoryResponse,
  type PersonalSummaryResponse,
  type PersonalTransferDto,
  type PersonalTransferListQuery,
  type PersonalWalletDto,
  type UpdatePersonalCategoryRequest,
  type UpdatePersonalEntryRequest,
  type UpdatePersonalWalletRequest,
} from '@furniture-erp/shared';
import type { Prisma, PrismaClient } from '@prisma/client';

import { parseFlexibleDate } from '../../../lib/date-input.js';
import { fromDbMoney, fromDbMoneySum, toDbMoney } from '../../../lib/money-mapper.js';
import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';
import { ApiError } from '../../../utils/api-error.js';
import { tryEvaluateAchievements } from '../growth/personal-growth-achievements.service.js';
import { tryAwardXp } from '../growth/personal-growth-xp.service.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

function endOfInclusiveDay(date: Date): Date {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

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

export async function ensurePersonalLedger(
  workspaceId: string,
  db: DbClient = defaultPrisma,
): Promise<void> {
  await assertPersonalWorkspace(workspaceId, db);

  const [walletCount, categoryCount] = await Promise.all([
    db.personalWallet.count({ where: { workspaceId } }),
    db.personalCategory.count({ where: { workspaceId } }),
  ]);

  if (walletCount === 0) {
    await db.personalWallet.createMany({
      data: DEFAULT_PERSONAL_WALLETS.map((wallet, index) => ({
        workspaceId,
        name: wallet.name,
        kind: wallet.kind,
        sortOrder: index,
      })),
    });
  }

  if (categoryCount === 0) {
    await db.personalCategory.createMany({
      data: DEFAULT_PERSONAL_CATEGORIES.map((category, index) => ({
        workspaceId,
        kind: category.kind,
        key: category.key,
        name: category.name,
        color: category.color,
        sortOrder: index,
      })),
    });
  }
}

function toWalletDto(
  row: {
    id: string;
    name: string;
    kind: PersonalWalletDto['kind'];
    openingBalanceSom: bigint;
    sortOrder: number;
    isArchived: boolean;
  },
  movement: { income: bigint; expense: bigint; transferIn: bigint; transferOut: bigint },
): PersonalWalletDto {
  const opening = fromDbMoney(row.openingBalanceSom);
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    openingBalanceSom: opening,
    balanceSom:
      opening +
      fromDbMoney(movement.income) -
      fromDbMoney(movement.expense) +
      fromDbMoney(movement.transferIn) -
      fromDbMoney(movement.transferOut),
    sortOrder: row.sortOrder,
    isArchived: row.isArchived,
  };
}

function toCategoryDto(row: {
  id: string;
  kind: PersonalCategoryDto['kind'];
  key: string | null;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}): PersonalCategoryDto {
  return {
    id: row.id,
    kind: row.kind,
    key: row.key,
    name: row.name,
    color: row.color,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

function toEntryDto(row: {
  id: string;
  type: PersonalEntryDto['type'];
  amount: bigint;
  occurredAt: Date;
  note: string | null;
  status: PersonalEntryDto['status'];
  createdAt: Date;
  wallet: { id: string; name: string; kind: PersonalWalletDto['kind'] };
  category: { id: string; name: string; color: string; kind: PersonalCategoryDto['kind'] };
}): PersonalEntryDto {
  return {
    id: row.id,
    type: row.type,
    amount: fromDbMoney(row.amount),
    occurredAt: row.occurredAt.toISOString(),
    note: row.note,
    status: row.status,
    wallet: row.wallet,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
  };
}

const emptyMovement = { income: 0n, expense: 0n, transferIn: 0n, transferOut: 0n };

async function movementByWallet(
  workspaceId: string,
  db: DbClient,
): Promise<Map<string, { income: bigint; expense: bigint; transferIn: bigint; transferOut: bigint }>> {
  const [grouped, outgoing, incoming] = await Promise.all([
    db.personalEntry.groupBy({
      by: ['walletId', 'type'],
      where: { workspaceId, status: ExpenseStatus.ACTIVE },
      _sum: { amount: true },
    }),
    db.personalTransfer.groupBy({
      by: ['fromWalletId'],
      where: { workspaceId, status: ExpenseStatus.ACTIVE },
      _sum: { amount: true },
    }),
    db.personalTransfer.groupBy({
      by: ['toWalletId'],
      where: { workspaceId, status: ExpenseStatus.ACTIVE },
      _sum: { amount: true },
    }),
  ]);
  const map = new Map<string, { income: bigint; expense: bigint; transferIn: bigint; transferOut: bigint }>();
  function bucket(walletId: string) {
    const current = map.get(walletId) ?? { ...emptyMovement };
    map.set(walletId, current);
    return current;
  }
  for (const row of grouped) {
    const current = bucket(row.walletId);
    const amount = row._sum.amount ?? 0n;
    if (row.type === PersonalEntryType.INCOME) current.income += amount;
    else current.expense += amount;
  }
  for (const row of outgoing) {
    bucket(row.fromWalletId).transferOut += row._sum.amount ?? 0n;
  }
  for (const row of incoming) {
    bucket(row.toWalletId).transferIn += row._sum.amount ?? 0n;
  }
  return map;
}

export async function listPersonalWallets(
  workspaceId: string,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalWalletDto[]> {
  await ensurePersonalLedger(workspaceId, db);
  const [rows, movements] = await Promise.all([
    db.personalWallet.findMany({
      where: { workspaceId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    movementByWallet(workspaceId, db),
  ]);
  return rows.map((row) => toWalletDto(row, movements.get(row.id) ?? { ...emptyMovement }));
}

export async function createPersonalWallet(
  workspaceId: string,
  identityId: string,
  input: CreatePersonalWalletRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalWalletDto> {
  await ensurePersonalLedger(workspaceId, db);
  const name = input.name.trim();
  if (name.length < 2) {
    throw ApiError.validation('Hisob nomini kiriting', [
      { field: 'name', message: 'Kamida 2 belgi' },
    ]);
  }
  try {
    const row = await db.personalWallet.create({
      data: {
        workspaceId,
        name,
        kind: input.kind,
        openingBalanceSom: toDbMoney(input.openingBalanceSom ?? 0),
      },
    });
    await recordAudit({
      storeId: null,
      actorUserId: null,
      eventType: AuditEventType.PERSONAL_WALLET_CREATED,
      entityType: AuditEntityType.PERSONAL_WALLET,
      entityId: row.id,
      summary: `Personal wallet created: ${row.name}`,
      metadata: { workspaceId, identityId, kind: row.kind },
    });
    return toWalletDto(row, { ...emptyMovement });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      throw ApiError.conflict('Bu nomdagi hisob allaqachon bor');
    }
    throw error;
  }
}

export async function updatePersonalWallet(
  workspaceId: string,
  walletId: string,
  input: UpdatePersonalWalletRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalWalletDto> {
  await ensurePersonalLedger(workspaceId, db);
  const existing = await db.personalWallet.findFirst({ where: { id: walletId, workspaceId } });
  if (!existing) throw ApiError.notFound('Hisob topilmadi');

  if (input.isArchived === true && !existing.isArchived) {
    const activeCount = await db.personalWallet.count({
      where: { workspaceId, isArchived: false },
    });
    if (activeCount <= 1) {
      throw ApiError.badRequest('Kamida bitta faol hisob kerak');
    }
  }

  const data: Prisma.PersonalWalletUpdateInput = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) {
      throw ApiError.validation('Hisob nomini kiriting', [
        { field: 'name', message: 'Kamida 2 belgi' },
      ]);
    }
    data.name = name;
  }
  if (input.kind !== undefined) data.kind = input.kind;
  if (input.openingBalanceSom !== undefined) data.openingBalanceSom = toDbMoney(input.openingBalanceSom);
  if (input.isArchived !== undefined) data.isArchived = input.isArchived;

  try {
    const row = await db.personalWallet.update({ where: { id: walletId }, data });
    const movements = await movementByWallet(workspaceId, db);
    return toWalletDto(row, movements.get(row.id) ?? { ...emptyMovement });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      throw ApiError.conflict('Bu nomdagi hisob allaqachon bor');
    }
    throw error;
  }
}

export async function listPersonalCategories(
  workspaceId: string,
  kind: PersonalCategoryKind | undefined,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalCategoryDto[]> {
  await ensurePersonalLedger(workspaceId, db);
  const rows = await db.personalCategory.findMany({
    where: { workspaceId, ...(kind ? { kind } : {}) },
    orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  });
  return rows.map(toCategoryDto);
}

export async function createPersonalCategory(
  workspaceId: string,
  input: CreatePersonalCategoryRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalCategoryDto> {
  await ensurePersonalLedger(workspaceId, db);
  const name = input.name.trim();
  if (name.length < 2) {
    throw ApiError.validation('Kategoriya nomini kiriting', [
      { field: 'name', message: 'Kamida 2 belgi' },
    ]);
  }
  try {
    const row = await db.personalCategory.create({
      data: {
        workspaceId,
        kind: input.kind,
        name,
        color: input.color?.trim() || 'slate',
      },
    });
    return toCategoryDto(row);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      throw ApiError.conflict('Bu nomdagi kategoriya allaqachon bor');
    }
    throw error;
  }
}

export async function updatePersonalCategory(
  workspaceId: string,
  categoryId: string,
  input: UpdatePersonalCategoryRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalCategoryDto> {
  await ensurePersonalLedger(workspaceId, db);
  const existing = await db.personalCategory.findFirst({ where: { id: categoryId, workspaceId } });
  if (!existing) throw ApiError.notFound('Kategoriya topilmadi');

  if (input.isActive === false && existing.isActive) {
    const activeOfKind = await db.personalCategory.count({
      where: { workspaceId, kind: existing.kind, isActive: true },
    });
    if (activeOfKind <= 1) {
      throw ApiError.badRequest('Har bir turdan kamida bitta faol kategoriya kerak');
    }
  }

  const data: Prisma.PersonalCategoryUpdateInput = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) {
      throw ApiError.validation('Kategoriya nomini kiriting', [
        { field: 'name', message: 'Kamida 2 belgi' },
      ]);
    }
    data.name = name;
  }
  if (input.color !== undefined) data.color = input.color.trim() || existing.color;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  try {
    const row = await db.personalCategory.update({ where: { id: categoryId }, data });
    return toCategoryDto(row);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      throw ApiError.conflict('Bu nomdagi kategoriya allaqachon bor');
    }
    throw error;
  }
}

const entryInclude = {
  wallet: { select: { id: true, name: true, kind: true } },
  category: { select: { id: true, name: true, color: true, kind: true } },
} as const;

async function loadWallet(workspaceId: string, walletId: string, db: DbClient) {
  const wallet = await db.personalWallet.findFirst({ where: { id: walletId, workspaceId } });
  if (!wallet || wallet.isArchived) throw ApiError.validation('Hisobni tanlang', [{ field: 'walletId', message: 'Hisob topilmadi' }]);
  return wallet;
}

async function loadCategory(
  workspaceId: string,
  categoryId: string,
  type: PersonalEntryType,
  db: DbClient,
) {
  const category = await db.personalCategory.findFirst({ where: { id: categoryId, workspaceId } });
  if (!category || !category.isActive) {
    throw ApiError.validation('Kategoriyani tanlang', [{ field: 'categoryId', message: 'Kategoriya topilmadi' }]);
  }
  if (category.kind !== type) {
    throw ApiError.validation('Kategoriya turi mos emas', [
      { field: 'categoryId', message: 'Daromad/xarajat kategoriyasi yozuv turiga mos kelishi kerak' },
    ]);
  }
  return category;
}

export async function listPersonalEntries(
  workspaceId: string,
  query: PersonalEntryListQuery,
  db: PrismaClient = defaultPrisma,
) {
  await ensurePersonalLedger(workspaceId, db);
  const { page, pageSize, skip, take } = normalisePagination(query.page, query.pageSize);
  const from = query.from ? parseFlexibleDate(query.from) : undefined;
  const to = query.to ? parseFlexibleDate(query.to) : undefined;

  const where: Prisma.PersonalEntryWhereInput = {
    workspaceId,
    ...(query.type ? { type: query.type } : {}),
    ...(query.walletId ? { walletId: query.walletId } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.status && query.status !== 'ALL' ? { status: query.status } : {}),
    ...(from || to
      ? {
          occurredAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: endOfInclusiveDay(to) } : {}),
          },
        }
      : {}),
  };

  const [totalItems, rows] = await Promise.all([
    db.personalEntry.count({ where }),
    db.personalEntry.findMany({
      where,
      include: entryInclude,
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    }),
  ]);

  return {
    items: rows.map(toEntryDto),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

export async function createPersonalEntry(
  workspaceId: string,
  identityId: string,
  input: CreatePersonalEntryRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalEntryDto> {
  await ensurePersonalLedger(workspaceId, db);
  await loadWallet(workspaceId, input.walletId, db);
  await loadCategory(workspaceId, input.categoryId, input.type, db);
  const occurredAt = parseFlexibleDate(input.occurredAt);
  if (!occurredAt) {
    throw ApiError.validation('Sanani kiriting', [{ field: 'occurredAt', message: 'Sana noto‘g‘ri' }]);
  }

  const row = await db.personalEntry.create({
    data: {
      workspaceId,
      walletId: input.walletId,
      categoryId: input.categoryId,
      type: input.type,
      amount: toDbMoney(input.amount),
      occurredAt,
      note: input.note?.trim() || null,
    },
    include: entryInclude,
  });
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_ENTRY_CREATED,
    entityType: AuditEntityType.PERSONAL_ENTRY,
    entityId: row.id,
    summary: `Personal ${row.type.toLowerCase()} recorded`,
    metadata: { workspaceId, identityId, type: row.type, amount: input.amount },
  });

  // Flat daily discipline XP — never scaled by amount (anti-cheat).
  const dayKey = toDayKey(occurredAt);
  await tryAwardXp({
    workspaceId,
    identityId,
    source: GrowthXpSource.FINANCE_DISCIPLINE,
    sourceEntityId: `finance-log:${dayKey}`,
    summary: 'Finance daily log',
    dayKey,
  });
  await tryEvaluateAchievements(workspaceId, identityId).catch(() => undefined);

  return toEntryDto(row);
}

export async function updatePersonalEntry(
  workspaceId: string,
  identityId: string,
  entryId: string,
  input: UpdatePersonalEntryRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalEntryDto> {
  await ensurePersonalLedger(workspaceId, db);
  const existing = await db.personalEntry.findFirst({ where: { id: entryId, workspaceId } });
  if (!existing) throw ApiError.notFound('Yozuv topilmadi');
  if (existing.status === ExpenseStatus.CANCELLED) {
    throw ApiError.conflict('Bekor qilingan yozuvni tahrirlab bo‘lmaydi');
  }

  const walletId = input.walletId ?? existing.walletId;
  const categoryId = input.categoryId ?? existing.categoryId;
  await loadWallet(workspaceId, walletId, db);
  await loadCategory(workspaceId, categoryId, existing.type, db);

  const data: Prisma.PersonalEntryUpdateInput = {};
  if (input.walletId) data.wallet = { connect: { id: walletId } };
  if (input.categoryId) data.category = { connect: { id: categoryId } };
  if (input.amount !== undefined) data.amount = toDbMoney(input.amount);
  if (input.occurredAt !== undefined) {
    const occurredAt = parseFlexibleDate(input.occurredAt);
    if (!occurredAt) {
      throw ApiError.validation('Sanani kiriting', [{ field: 'occurredAt', message: 'Sana noto‘g‘ri' }]);
    }
    data.occurredAt = occurredAt;
  }
  if (input.note !== undefined) data.note = input.note?.trim() || null;

  const row = await db.personalEntry.update({
    where: { id: entryId },
    data,
    include: entryInclude,
  });
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_ENTRY_UPDATED,
    entityType: AuditEntityType.PERSONAL_ENTRY,
    entityId: row.id,
    summary: `Personal ${row.type.toLowerCase()} updated`,
    metadata: { workspaceId, identityId },
  });
  return toEntryDto(row);
}

const transferInclude = {
  fromWallet: { select: { id: true, name: true, kind: true } },
  toWallet: { select: { id: true, name: true, kind: true } },
} as const;

function toTransferDto(row: {
  id: string;
  amount: bigint;
  occurredAt: Date;
  note: string | null;
  status: PersonalTransferDto['status'];
  createdAt: Date;
  fromWallet: { id: string; name: string; kind: PersonalWalletDto['kind'] };
  toWallet: { id: string; name: string; kind: PersonalWalletDto['kind'] };
}): PersonalTransferDto {
  return {
    id: row.id,
    amount: fromDbMoney(row.amount),
    occurredAt: row.occurredAt.toISOString(),
    note: row.note,
    status: row.status,
    fromWallet: row.fromWallet,
    toWallet: row.toWallet,
    createdAt: row.createdAt.toISOString(),
  };
}

function transferOccurredWhere(query: Pick<PersonalTransferListQuery, 'from' | 'to'>) {
  const from = query.from ? parseFlexibleDate(query.from) : undefined;
  const to = query.to ? parseFlexibleDate(query.to) : undefined;
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: endOfInclusiveDay(to) } : {}),
  };
}

export async function listPersonalTransfers(
  workspaceId: string,
  query: PersonalTransferListQuery,
  db: PrismaClient = defaultPrisma,
) {
  await ensurePersonalLedger(workspaceId, db);
  const { page, pageSize, skip, take } = normalisePagination(query.page, query.pageSize);
  const occurredAt = transferOccurredWhere(query);

  const where: Prisma.PersonalTransferWhereInput = {
    workspaceId,
    ...(query.status && query.status !== 'ALL' ? { status: query.status } : {}),
    ...(query.walletId
      ? { OR: [{ fromWalletId: query.walletId }, { toWalletId: query.walletId }] }
      : {}),
    ...(occurredAt ? { occurredAt } : {}),
  };

  const [totalItems, rows] = await Promise.all([
    db.personalTransfer.count({ where }),
    db.personalTransfer.findMany({
      where,
      include: transferInclude,
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    }),
  ]);

  return {
    items: rows.map(toTransferDto),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

function containsText(value: string): Prisma.StringFilter {
  return { contains: value, mode: 'insensitive' };
}

export async function listPersonalHistory(
  workspaceId: string,
  query: PersonalHistoryListQuery,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalHistoryResponse> {
  await ensurePersonalLedger(workspaceId, db);
  const { page, pageSize, skip, take } = normalisePagination(query.page, query.pageSize);
  const kind = query.kind ?? PersonalHistoryKind.ALL;
  const q = query.q?.trim().slice(0, 80);
  const from = query.from ? parseFlexibleDate(query.from) : undefined;
  const to = query.to ? parseFlexibleDate(query.to) : undefined;
  const occurredAt =
    from || to
      ? {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: endOfInclusiveDay(to) } : {}),
        }
      : undefined;

  const entryType =
    kind === PersonalHistoryKind.INCOME
      ? PersonalEntryType.INCOME
      : kind === PersonalHistoryKind.EXPENSE
        ? PersonalEntryType.EXPENSE
        : undefined;

  const entryWhere: Prisma.PersonalEntryWhereInput = {
    workspaceId,
    status: ExpenseStatus.ACTIVE,
    ...(entryType ? { type: entryType } : {}),
    ...(query.walletId ? { walletId: query.walletId } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(occurredAt ? { occurredAt } : {}),
    ...(q
      ? {
          OR: [
            { note: containsText(q) },
            { category: { name: containsText(q) } },
            { wallet: { name: containsText(q) } },
          ],
        }
      : {}),
  };

  const transferWhere: Prisma.PersonalTransferWhereInput = {
    workspaceId,
    status: ExpenseStatus.ACTIVE,
    ...(query.walletId
      ? { OR: [{ fromWalletId: query.walletId }, { toWalletId: query.walletId }] }
      : {}),
    ...(occurredAt ? { occurredAt } : {}),
    ...(q
      ? {
          OR: [
            { note: containsText(q) },
            { fromWallet: { name: containsText(q) } },
            { toWallet: { name: containsText(q) } },
          ],
        }
      : {}),
  };

  const loadEntries = kind !== PersonalHistoryKind.TRANSFER;
  const loadTransfers = (kind === PersonalHistoryKind.ALL || kind === PersonalHistoryKind.TRANSFER) && !query.categoryId;

  const [entryRows, transferRows] = await Promise.all([
    loadEntries
      ? db.personalEntry.findMany({
          where: entryWhere,
          include: entryInclude,
          orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        })
      : Promise.resolve([]),
    loadTransfers
      ? db.personalTransfer.findMany({
          where: transferWhere,
          include: transferInclude,
          orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        })
      : Promise.resolve([]),
  ]);

  const activity: PersonalActivityItem[] = [
    ...entryRows.map((row) => {
      const mapped = toEntryDto(row);
      return {
        kind: 'ENTRY' as const,
        occurredAt: mapped.occurredAt,
        createdAt: mapped.createdAt,
        entry: mapped,
      };
    }),
    ...transferRows.map((row) => {
      const mapped = toTransferDto(row);
      return {
        kind: 'TRANSFER' as const,
        occurredAt: mapped.occurredAt,
        createdAt: mapped.createdAt,
        transfer: mapped,
      };
    }),
  ].sort(comparePersonalActivity);

  let incomeSom = 0;
  let expenseSom = 0;
  let transferSom = 0;
  for (const item of activity) {
    if (item.kind === 'TRANSFER') {
      transferSom += item.transfer.amount;
    } else if (item.entry.type === PersonalEntryType.INCOME) {
      incomeSom += item.entry.amount;
    } else {
      expenseSom += item.entry.amount;
    }
  }

  return {
    items: activity.slice(skip, skip + take),
    totals: {
      incomeSom,
      expenseSom,
      netSom: incomeSom - expenseSom,
      transferSom,
    },
    meta: buildPaginationMeta(page, pageSize, activity.length),
  };
}

export async function createPersonalTransfer(
  workspaceId: string,
  identityId: string,
  input: CreatePersonalTransferRequest,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalTransferDto> {
  await ensurePersonalLedger(workspaceId, db);
  if (input.fromWalletId === input.toWalletId) {
    throw ApiError.validation('Boshqa hisobni tanlang', [
      { field: 'toWalletId', message: 'O‘tkazma bir xil hisobga bo‘lmaydi' },
    ]);
  }
  await loadWallet(workspaceId, input.fromWalletId, db);
  await loadWallet(workspaceId, input.toWalletId, db);
  const occurredAt = parseFlexibleDate(input.occurredAt);
  if (!occurredAt) {
    throw ApiError.validation('Sanani kiriting', [{ field: 'occurredAt', message: 'Sana noto‘g‘ri' }]);
  }

  const row = await db.personalTransfer.create({
    data: {
      workspaceId,
      fromWalletId: input.fromWalletId,
      toWalletId: input.toWalletId,
      amount: toDbMoney(input.amount),
      occurredAt,
      note: input.note?.trim() || null,
    },
    include: transferInclude,
  });
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_TRANSFER_CREATED,
    entityType: AuditEntityType.PERSONAL_TRANSFER,
    entityId: row.id,
    summary: 'Personal transfer recorded',
    metadata: {
      workspaceId,
      identityId,
      fromWalletId: input.fromWalletId,
      toWalletId: input.toWalletId,
      amount: input.amount,
    },
  });
  return toTransferDto(row);
}

export async function cancelPersonalTransfer(
  workspaceId: string,
  identityId: string,
  transferId: string,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalTransferDto> {
  await ensurePersonalLedger(workspaceId, db);
  const existing = await db.personalTransfer.findFirst({
    where: { id: transferId, workspaceId },
    include: transferInclude,
  });
  if (!existing) throw ApiError.notFound('O‘tkazma topilmadi');
  if (existing.status === ExpenseStatus.CANCELLED) return toTransferDto(existing);

  const row = await db.personalTransfer.update({
    where: { id: transferId },
    data: { status: ExpenseStatus.CANCELLED, cancelledAt: new Date() },
    include: transferInclude,
  });
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_TRANSFER_CANCELLED,
    entityType: AuditEntityType.PERSONAL_TRANSFER,
    entityId: row.id,
    summary: 'Personal transfer cancelled',
    metadata: { workspaceId, identityId },
  });
  return toTransferDto(row);
}

export async function cancelPersonalEntry(
  workspaceId: string,
  identityId: string,
  entryId: string,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalEntryDto> {
  await ensurePersonalLedger(workspaceId, db);
  const existing = await db.personalEntry.findFirst({
    where: { id: entryId, workspaceId },
    include: entryInclude,
  });
  if (!existing) throw ApiError.notFound('Yozuv topilmadi');
  if (existing.status === ExpenseStatus.CANCELLED) return toEntryDto(existing);

  const row = await db.personalEntry.update({
    where: { id: entryId },
    data: { status: ExpenseStatus.CANCELLED, cancelledAt: new Date() },
    include: entryInclude,
  });
  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_ENTRY_CANCELLED,
    entityType: AuditEntityType.PERSONAL_ENTRY,
    entityId: row.id,
    summary: `Personal ${row.type.toLowerCase()} cancelled`,
    metadata: { workspaceId, identityId },
  });
  return toEntryDto(row);
}

export async function getPersonalSummary(
  workspaceId: string,
  db: PrismaClient = defaultPrisma,
): Promise<PersonalSummaryResponse> {
  const wallets = await listPersonalWallets(workspaceId, db);
  const { start, end } = monthBounds();
  const month = await db.personalEntry.groupBy({
    by: ['type'],
    where: {
      workspaceId,
      status: ExpenseStatus.ACTIVE,
      occurredAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });
  let monthIncomeSom = 0;
  let monthExpenseSom = 0;
  for (const row of month) {
    const amount = fromDbMoneySum(row._sum.amount);
    if (row.type === PersonalEntryType.INCOME) monthIncomeSom = amount;
    else monthExpenseSom = amount;
  }
  const [recentEntries, recentTransfers] = await Promise.all([
    db.personalEntry.findMany({
      where: { workspaceId, status: ExpenseStatus.ACTIVE },
      include: entryInclude,
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    }),
    db.personalTransfer.findMany({
      where: { workspaceId, status: ExpenseStatus.ACTIVE },
      include: transferInclude,
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    }),
  ]);
  const recentActivity = [
    ...recentEntries.map((row) => {
      const entry = toEntryDto(row);
      return { kind: 'ENTRY' as const, occurredAt: entry.occurredAt, createdAt: entry.createdAt, entry };
    }),
    ...recentTransfers.map((row) => {
      const transfer = toTransferDto(row);
      return {
        kind: 'TRANSFER' as const,
        occurredAt: transfer.occurredAt,
        createdAt: transfer.createdAt,
        transfer,
      };
    }),
  ]
    .sort((a, b) => {
      const occurred = b.occurredAt.localeCompare(a.occurredAt);
      if (occurred !== 0) return occurred;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, 8);

  return {
    totalBalanceSom: wallets.filter((wallet) => !wallet.isArchived).reduce((sum, wallet) => sum + wallet.balanceSom, 0),
    monthIncomeSom,
    monthExpenseSom,
    monthNetSom: monthIncomeSom - monthExpenseSom,
    wallets,
    recentEntries: recentEntries.map(toEntryDto),
    recentActivity,
  };
}
