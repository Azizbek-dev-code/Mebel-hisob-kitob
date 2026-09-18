import {
  GrowthEventPriority,
  GrowthEventRecurrence,
  GrowthTodoStatus,
  GrowthXpSource,
  WorkspaceStatus,
  WorkspaceType,
  computeRemindAt,
  dueAtFromHint,
  suggestTodoFromTitle,
  type CreateGrowthTodoRequest,
  type GrowthTodayTodosResponse,
  type GrowthTodoDto,
  type GrowthTodoListResponse,
  type SuggestGrowthTodoResponse,
  type UpdateGrowthTodoRequest,
} from '@furniture-erp/shared';
import type { GrowthTodo, PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';
import { ApiError } from '../../../utils/api-error.js';

import { tryAwardXp } from './personal-growth-xp.service.js';

type DbClient = Pick<PrismaClient, 'workspace' | 'growthTodo' | 'growthCalendarEvent'>;

const MAX_DAILY_FOCUS = 3;
const OPEN_STATUSES: GrowthTodoStatus[] = [
  GrowthTodoStatus.TODO,
  GrowthTodoStatus.IN_PROGRESS,
];

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

function toDto(row: GrowthTodo): GrowthTodoDto {
  const remindAt =
    row.dueAt && row.remindMinutesBefore != null
      ? computeRemindAt(row.dueAt, row.remindMinutesBefore)
      : null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority as GrowthEventPriority,
    status: row.status as GrowthTodoStatus,
    category: row.category,
    dueAt: row.dueAt ? row.dueAt.toISOString() : null,
    remindMinutesBefore: row.remindMinutesBefore,
    remindAt: remindAt ? remindAt.toISOString() : null,
    estimatedMinutes: row.estimatedMinutes,
    actualMinutes: row.actualMinutes,
    recurrence: row.recurrence as GrowthEventRecurrence,
    intervalDays: row.intervalDays,
    isDailyFocus: row.isDailyFocus,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    linkedGoalId: row.linkedGoalId,
    linkedCalendarEventId: row.linkedCalendarEventId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseOptionalInstant(value: string | null | undefined, field: string): Date | null {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw ApiError.badRequest(`${field} noto‘g‘ri`);
  return date;
}

function priorityRank(priority: GrowthEventPriority): number {
  if (priority === GrowthEventPriority.HIGH) return 0;
  if (priority === GrowthEventPriority.MEDIUM) return 1;
  return 2;
}

async function enforceDailyFocusLimit(
  workspaceId: string,
  db: DbClient,
  exceptId?: string,
): Promise<void> {
  const count = await db.growthTodo.count({
    where: {
      workspaceId,
      isDailyFocus: true,
      status: { in: OPEN_STATUSES },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
  });
  if (count >= MAX_DAILY_FOCUS) {
    throw ApiError.badRequest('Bugungi asosiy vazifalar 3 tadan oshmasin');
  }
}

export function suggestGrowthTodo(title: string): SuggestGrowthTodoResponse {
  return suggestTodoFromTitle(title);
}

export async function listGrowthTodos(
  workspaceId: string,
  opts: { status?: GrowthTodoStatus | 'OPEN' } = {},
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthTodoListResponse> {
  await assertPersonalWorkspace(workspaceId, db);

  const statusFilter =
    opts.status === 'OPEN'
      ? { status: { in: OPEN_STATUSES } }
      : opts.status
        ? { status: opts.status }
        : { status: { not: GrowthTodoStatus.CANCELLED } };

  const rows = await db.growthTodo.findMany({
    where: { workspaceId, ...statusFilter },
    orderBy: [{ isDailyFocus: 'desc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  });

  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  const doneTodayCount = rows.filter(
    (row) =>
      row.status === GrowthTodoStatus.DONE &&
      row.completedAt &&
      row.completedAt.getTime() >= start.getTime(),
  ).length;

  return {
    items: rows.map(toDto),
    openCount: rows.filter((row) => OPEN_STATUSES.includes(row.status as GrowthTodoStatus)).length,
    doneTodayCount,
  };
}

export async function listTodayGrowthTodos(
  workspaceId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthTodayTodosResponse> {
  await assertPersonalWorkspace(workspaceId, db);

  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  const dayEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  );

  const open = await db.growthTodo.findMany({
    where: { workspaceId, status: { in: OPEN_STATUSES } },
    orderBy: [{ isDailyFocus: 'desc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
  });

  const focusMarked = open.filter((row) => row.isDailyFocus).slice(0, MAX_DAILY_FOCUS);
  const dueToday = open.filter(
    (row) => row.dueAt && row.dueAt >= dayStart && row.dueAt <= dayEnd,
  );
  const overdue = open.filter((row) => row.dueAt && row.dueAt < dayStart);

  const focusIds = new Set(focusMarked.map((row) => row.id));
  if (focusMarked.length < MAX_DAILY_FOCUS) {
    const smart = [...open]
      .filter((row) => !focusIds.has(row.id))
      .sort((a, b) => {
        const aDue = a.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
        const bDue = b.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
        if (aDue !== bDue) return aDue - bDue;
        return (
          priorityRank(a.priority as GrowthEventPriority) -
          priorityRank(b.priority as GrowthEventPriority)
        );
      })
      .slice(0, MAX_DAILY_FOCUS - focusMarked.length);
    for (const row of smart) focusIds.add(row.id);
    focusMarked.push(...smart);
  }

  return {
    focus: focusMarked.map(toDto),
    dueToday: dueToday.map(toDto),
    overdue: overdue.map(toDto),
  };
}

export async function createGrowthTodo(
  workspaceId: string,
  body: CreateGrowthTodoRequest,
  actorIdentityId: string,
  db: DbClient = defaultPrisma,
): Promise<GrowthTodoDto> {
  await assertPersonalWorkspace(workspaceId, db);

  const title = body.title.trim();
  if (!title) throw ApiError.badRequest('Sarlavha majburiy');

  const hint = suggestTodoFromTitle(title);
  const recurrence = body.recurrence ?? GrowthEventRecurrence.NONE;
  if (recurrence === GrowthEventRecurrence.CUSTOM && !body.intervalDays) {
    throw ApiError.badRequest('Custom takrorlash uchun interval kunlari kerak');
  }

  let dueAt = parseOptionalInstant(body.dueAt, 'dueAt');
  if (dueAt == null && body.dueAt === undefined) {
    dueAt = dueAtFromHint(hint.dueHint);
  }

  if (body.isDailyFocus) {
    await enforceDailyFocusLimit(workspaceId, db);
  }

  let linkedCalendarEventId = body.linkedCalendarEventId ?? null;
  if (body.addToCalendar && !linkedCalendarEventId) {
    const startsAt = dueAt ?? new Date();
    const endsAt = new Date(
      startsAt.getTime() + (body.estimatedMinutes ?? hint.estimatedMinutes ?? 30) * 60_000,
    );
    const event = await db.growthCalendarEvent.create({
      data: {
        workspaceId,
        title,
        category: body.category?.trim() || hint.category,
        priority: body.priority ?? hint.priority,
        startsAt,
        endsAt,
        remindMinutesBefore: body.remindMinutesBefore ?? null,
        note: body.description?.trim() || null,
      },
    });
    linkedCalendarEventId = event.id;
  }

  const row = await db.growthTodo.create({
    data: {
      workspaceId,
      title,
      description: body.description?.trim() || null,
      priority: body.priority ?? hint.priority,
      category: body.category?.trim() || hint.category,
      dueAt,
      remindMinutesBefore:
        body.remindMinutesBefore === undefined ? null : body.remindMinutesBefore,
      estimatedMinutes:
        body.estimatedMinutes === undefined
          ? hint.estimatedMinutes
          : body.estimatedMinutes,
      recurrence,
      intervalDays: recurrence === GrowthEventRecurrence.CUSTOM ? body.intervalDays ?? null : null,
      isDailyFocus: Boolean(body.isDailyFocus),
      linkedGoalId: body.linkedGoalId ?? null,
      linkedCalendarEventId,
    },
  });

  if (linkedCalendarEventId) {
    await db.growthCalendarEvent.updateMany({
      where: { id: linkedCalendarEventId, workspaceId },
      data: { linkedTodoId: row.id },
    });
  }

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_TODO_CREATED',
    entityType: 'GROWTH_TODO',
    entityId: row.id,
    summary: `Growth todo created: ${row.title}`,
    metadata: { workspaceId, identityId: actorIdentityId },
  });

  return toDto(row);
}

export async function updateGrowthTodo(
  workspaceId: string,
  todoId: string,
  body: UpdateGrowthTodoRequest,
  actorIdentityId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthTodoDto> {
  await assertPersonalWorkspace(workspaceId, db);

  const existing = await db.growthTodo.findFirst({
    where: { id: todoId, workspaceId },
  });
  if (!existing) throw ApiError.notFound('Vazifa topilmadi');

  if (body.isDailyFocus === true && !existing.isDailyFocus) {
    await enforceDailyFocusLimit(workspaceId, db, existing.id);
  }

  const nextStatus = body.status ?? (existing.status as GrowthTodoStatus);
  const completedAt =
    nextStatus === GrowthTodoStatus.DONE
      ? existing.completedAt ?? now
      : nextStatus === GrowthTodoStatus.TODO || nextStatus === GrowthTodoStatus.IN_PROGRESS
        ? null
        : existing.completedAt;

  const recurrence = body.recurrence ?? (existing.recurrence as GrowthEventRecurrence);
  const intervalDays =
    body.intervalDays !== undefined ? body.intervalDays : existing.intervalDays;
  if (recurrence === GrowthEventRecurrence.CUSTOM && !intervalDays) {
    throw ApiError.badRequest('Custom takrorlash uchun interval kunlari kerak');
  }

  const row = await db.growthTodo.update({
    where: { id: existing.id },
    data: {
      title: body.title !== undefined ? body.title.trim() : undefined,
      description:
        body.description === undefined ? undefined : body.description?.trim() || null,
      priority: body.priority,
      status: body.status,
      category: body.category === undefined ? undefined : body.category?.trim() || null,
      dueAt: body.dueAt !== undefined ? parseOptionalInstant(body.dueAt, 'dueAt') : undefined,
      remindMinutesBefore: body.remindMinutesBefore,
      estimatedMinutes: body.estimatedMinutes,
      actualMinutes: body.actualMinutes,
      recurrence: body.recurrence,
      intervalDays:
        body.recurrence !== undefined || body.intervalDays !== undefined
          ? recurrence === GrowthEventRecurrence.CUSTOM
            ? intervalDays
            : null
          : undefined,
      isDailyFocus: body.isDailyFocus,
      completedAt: body.status !== undefined ? completedAt : undefined,
      linkedGoalId: body.linkedGoalId === undefined ? undefined : body.linkedGoalId,
      linkedCalendarEventId:
        body.linkedCalendarEventId === undefined ? undefined : body.linkedCalendarEventId,
    },
  });

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_TODO_UPDATED',
    entityType: 'GROWTH_TODO',
    entityId: row.id,
    summary: `Growth todo updated: ${row.title}`,
    metadata: {
      workspaceId,
      identityId: actorIdentityId,
      status: row.status,
    },
  });

  if (
    body.status === GrowthTodoStatus.DONE &&
    existing.status !== GrowthTodoStatus.DONE
  ) {
    await tryAwardXp({
      workspaceId,
      identityId: actorIdentityId,
      source: GrowthXpSource.TODO_COMPLETED,
      sourceEntityId: row.id,
      summary: `Todo: ${row.title}`,
    });
  }

  return toDto(row);
}
