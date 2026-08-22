import {
  buildPaginationMeta,
  normalisePagination,
  type AuditLogItem,
  type PaginatedResult,
} from '@furniture-erp/shared';
import type { Prisma } from '@prisma/client';

import { parseFlexibleDate } from '../lib/date-input.js';
import { prisma } from '../lib/prisma.js';

/**
 * Audit trail persistence.
 *
 * Deliberately exposes only `insertAuditLog` and `listAuditLogs`: there is no
 * update and no delete, so no caller — however well-intentioned — can rewrite
 * history through this module. Every query is keyed on `storeId`.
 */

export interface InsertAuditLogInput {
  storeId?: string | null;
  actorUserId?: string | null;
  eventType: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  /** Already sanitised by the service; the repository stores it verbatim. */
  metadata?: Prisma.InputJsonValue | null;
}

export interface ListAuditLogsOptions {
  storeId: string;
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  actorUserId?: string;
  eventType?: string;
  entityType?: string;
  search?: string;
}

const actorSelect = {
  id: true,
  fullName: true,
} satisfies Prisma.UserSelect;

const auditSelect = {
  id: true,
  eventType: true,
  entityType: true,
  entityId: true,
  summary: true,
  metadata: true,
  createdAt: true,
  actor: { select: actorSelect },
} satisfies Prisma.AuditLogSelect;

type AuditRow = Prisma.AuditLogGetPayload<{ select: typeof auditSelect }>;

function endOfInclusiveDay(date: Date): Date {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function toItem(row: AuditRow): AuditLogItem {
  return {
    id: row.id,
    eventType: row.eventType,
    entityType: row.entityType,
    entityId: row.entityId,
    summary: row.summary,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    actor: row.actor ? { id: row.actor.id, fullName: row.actor.fullName } : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function insertAuditLog(input: InsertAuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      storeId: input.storeId ?? null,
      actorUserId: input.actorUserId ?? null,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      ...(input.metadata == null ? {} : { metadata: input.metadata }),
    },
    select: { id: true },
  });
}

export async function listAuditLogs(
  options: ListAuditLogsOptions,
): Promise<PaginatedResult<AuditLogItem>> {
  const { page, pageSize, skip, take } = normalisePagination(options.page, options.pageSize);
  const search = options.search?.trim();

  const fromDate = options.from ? parseFlexibleDate(options.from) : null;
  const toDate = options.to ? parseFlexibleDate(options.to) : null;

  const where: Prisma.AuditLogWhereInput = {
    storeId: options.storeId,
    ...(options.actorUserId ? { actorUserId: options.actorUserId } : {}),
    ...(options.eventType ? { eventType: options.eventType } : {}),
    ...(options.entityType ? { entityType: options.entityType } : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: endOfInclusiveDay(toDate) } : {}),
          },
        }
      : {}),
    ...(search ? { summary: { contains: search, mode: 'insensitive' } } : {}),
  };

  const [rows, totalItems] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: auditSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: rows.map(toItem),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}
