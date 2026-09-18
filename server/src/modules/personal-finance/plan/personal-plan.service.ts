import {
  GrowthEventPriority,
  GrowthEventRecurrence,
  WorkspaceStatus,
  WorkspaceType,
  calendarDayKey,
  computeRemindAt,
  type CreateGrowthCalendarEventRequest,
  type GrowthCalendarEventDto,
  type GrowthCalendarEventListResponse,
  type GrowthDayPlanResponse,
  type GrowthUpcomingRemindersResponse,
  type UpdateGrowthCalendarEventRequest,
} from '@furniture-erp/shared';
import type { GrowthCalendarEvent, PrismaClient } from '@prisma/client';

import { ApiError } from '../../../utils/api-error.js';
import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';

type DbClient = Pick<
  PrismaClient,
  'workspace' | 'growthCalendarEvent'
>;

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

function toDto(row: GrowthCalendarEvent): GrowthCalendarEventDto {
  const remindAt = computeRemindAt(row.startsAt, row.remindMinutesBefore);
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    category: row.category,
    priority: row.priority as GrowthEventPriority,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    allDay: row.allDay,
    recurrence: row.recurrence as GrowthEventRecurrence,
    intervalDays: row.intervalDays,
    remindMinutesBefore: row.remindMinutesBefore,
    remindAt: remindAt ? remindAt.toISOString() : null,
    isCancelled: row.isCancelled,
    linkedGoalId: row.linkedGoalId,
    linkedTodoId: row.linkedTodoId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseInstant(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw ApiError.badRequest(`${field} noto‘g‘ri`);
  }
  return date;
}

function assertTimeOrder(startsAt: Date, endsAt: Date | null): void {
  if (endsAt && endsAt.getTime() < startsAt.getTime()) {
    throw ApiError.badRequest('Tugash vaqti boshlanishdan oldin bo‘lolmaydi');
  }
}

export async function listGrowthCalendarEvents(
  workspaceId: string,
  range: { from: Date; to: Date },
  db: DbClient = defaultPrisma,
): Promise<GrowthCalendarEventListResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  if (range.to.getTime() < range.from.getTime()) {
    throw ApiError.badRequest('Davr noto‘g‘ri');
  }
  // Cap range to ~93 days to avoid accidental huge scans.
  const maxMs = 93 * 24 * 60 * 60 * 1000;
  if (range.to.getTime() - range.from.getTime() > maxMs) {
    throw ApiError.badRequest('Davr 93 kundan oshmasin');
  }

  const rows = await db.growthCalendarEvent.findMany({
    where: {
      workspaceId,
      isCancelled: false,
      startsAt: { gte: range.from, lte: range.to },
    },
    orderBy: [{ startsAt: 'asc' }],
  });

  const items = rows.map(toDto);
  const daysWithEvents = [
    ...new Set(items.map((item) => calendarDayKey(item.startsAt)).filter(Boolean)),
  ].sort();

  return { items, daysWithEvents };
}

export async function getGrowthDayPlan(
  workspaceId: string,
  dateKey: string,
  db: DbClient = defaultPrisma,
): Promise<GrowthDayPlanResponse> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw ApiError.badRequest('Sana YYYY-MM-DD bo‘lishi kerak');
  }
  const from = new Date(`${dateKey}T00:00:00.000Z`);
  const to = new Date(`${dateKey}T23:59:59.999Z`);
  const list = await listGrowthCalendarEvents(workspaceId, { from, to }, db);
  return { date: dateKey, items: list.items };
}

export async function listUpcomingGrowthReminders(
  workspaceId: string,
  withinMinutes = 24 * 60,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthUpcomingRemindersResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const horizon = new Date(now.getTime() + Math.max(1, withinMinutes) * 60_000);

  const rows = await db.growthCalendarEvent.findMany({
    where: {
      workspaceId,
      isCancelled: false,
      remindMinutesBefore: { not: null },
      startsAt: { gte: now, lte: new Date(horizon.getTime() + 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: [{ startsAt: 'asc' }],
    take: 50,
  });

  const items = rows
    .map(toDto)
    .filter((item) => {
      if (!item.remindAt) return false;
      const remindAt = new Date(item.remindAt).getTime();
      return remindAt >= now.getTime() && remindAt <= horizon.getTime();
    });

  return { items };
}

export async function createGrowthCalendarEvent(
  workspaceId: string,
  body: CreateGrowthCalendarEventRequest,
  actorIdentityId: string,
  db: DbClient = defaultPrisma,
): Promise<GrowthCalendarEventDto> {
  await assertPersonalWorkspace(workspaceId, db);

  const startsAt = parseInstant(body.startsAt, 'startsAt');
  const endsAt = body.endsAt ? parseInstant(body.endsAt, 'endsAt') : null;
  assertTimeOrder(startsAt, endsAt);

  const recurrence = body.recurrence ?? GrowthEventRecurrence.NONE;
  if (recurrence === GrowthEventRecurrence.CUSTOM && !body.intervalDays) {
    throw ApiError.badRequest('Custom takrorlash uchun interval kunlari kerak');
  }

  const row = await db.growthCalendarEvent.create({
    data: {
      workspaceId,
      title: body.title.trim(),
      note: body.note?.trim() || null,
      category: body.category?.trim() || null,
      priority: body.priority ?? GrowthEventPriority.MEDIUM,
      startsAt,
      endsAt,
      allDay: Boolean(body.allDay),
      recurrence,
      intervalDays: recurrence === GrowthEventRecurrence.CUSTOM ? body.intervalDays ?? null : null,
      remindMinutesBefore:
        body.remindMinutesBefore === undefined ? null : body.remindMinutesBefore,
      linkedGoalId: body.linkedGoalId ?? null,
      linkedTodoId: body.linkedTodoId ?? null,
    },
  });

  await recordAudit({
    eventType: 'GROWTH_CALENDAR_EVENT_CREATED',
    entityType: 'GROWTH_CALENDAR_EVENT',
    entityId: row.id,
    actorUserId: null,
    storeId: null,
    summary: `Growth calendar event created: ${row.title}`,
    metadata: { workspaceId, identityId: actorIdentityId, title: row.title },
  });

  return toDto(row);
}

export async function updateGrowthCalendarEvent(
  workspaceId: string,
  eventId: string,
  body: UpdateGrowthCalendarEventRequest,
  actorIdentityId: string,
  db: DbClient = defaultPrisma,
): Promise<GrowthCalendarEventDto> {
  await assertPersonalWorkspace(workspaceId, db);

  const existing = await db.growthCalendarEvent.findFirst({
    where: { id: eventId, workspaceId },
  });
  if (!existing) throw ApiError.notFound('Tadbir topilmadi');

  const startsAt = body.startsAt ? parseInstant(body.startsAt, 'startsAt') : existing.startsAt;
  const endsAt =
    body.endsAt === undefined
      ? existing.endsAt
      : body.endsAt === null
        ? null
        : parseInstant(body.endsAt, 'endsAt');
  assertTimeOrder(startsAt, endsAt);

  const recurrence = body.recurrence ?? (existing.recurrence as GrowthEventRecurrence);
  const intervalDays =
    body.intervalDays !== undefined
      ? body.intervalDays
      : existing.intervalDays;
  if (recurrence === GrowthEventRecurrence.CUSTOM && !intervalDays) {
    throw ApiError.badRequest('Custom takrorlash uchun interval kunlari kerak');
  }

  const row = await db.growthCalendarEvent.update({
    where: { id: existing.id },
    data: {
      title: body.title !== undefined ? body.title.trim() : undefined,
      note: body.note === undefined ? undefined : body.note?.trim() || null,
      category: body.category === undefined ? undefined : body.category?.trim() || null,
      priority: body.priority,
      startsAt: body.startsAt ? startsAt : undefined,
      endsAt: body.endsAt !== undefined ? endsAt : undefined,
      allDay: body.allDay,
      recurrence: body.recurrence,
      intervalDays:
        body.recurrence !== undefined || body.intervalDays !== undefined
          ? recurrence === GrowthEventRecurrence.CUSTOM
            ? intervalDays
            : null
          : undefined,
      remindMinutesBefore: body.remindMinutesBefore,
      isCancelled: body.isCancelled,
      linkedGoalId: body.linkedGoalId === undefined ? undefined : body.linkedGoalId,
      linkedTodoId: body.linkedTodoId === undefined ? undefined : body.linkedTodoId,
    },
  });

  await recordAudit({
    eventType: 'GROWTH_CALENDAR_EVENT_UPDATED',
    entityType: 'GROWTH_CALENDAR_EVENT',
    entityId: row.id,
    actorUserId: null,
    storeId: null,
    summary: `Growth calendar event updated: ${row.title}`,
    metadata: {
      workspaceId,
      identityId: actorIdentityId,
      isCancelled: row.isCancelled,
    },
  });

  return toDto(row);
}
