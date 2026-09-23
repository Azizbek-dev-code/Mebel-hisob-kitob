import {
  GrowthNotificationKind,
  GrowthTodoStatus,
  WorkspaceStatus,
  WorkspaceType,
  GROWTH_NOTIFICATION_LIST_LIMIT,
  isGrowthNotifyPrefEnabled,
  type GrowthNotificationDto,
  type GrowthNotificationPrefs,
  type GrowthNotificationsListResponse,
  type MarkGrowthNotificationsRequest,
  type UpdateGrowthNotificationPrefsRequest,
  type GrowthNotifyPrefKey,
} from '@furniture-erp/shared';
import type { GrowthNotification, PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { ApiError } from '../../../utils/api-error.js';
import { logger } from '../../../utils/logger.js';

type DbClient = {
  workspace: PrismaClient['workspace'];
  growthSocialProfile: PrismaClient['growthSocialProfile'];
  growthNotification: PrismaClient['growthNotification'];
  growthTodo: PrismaClient['growthTodo'];
  growthCalendarEvent: PrismaClient['growthCalendarEvent'];
  growthHabit: PrismaClient['growthHabit'];
};

export type EmitGrowthNotificationInput = {
  identityId: string;
  workspaceId?: string | null;
  kind: (typeof GrowthNotificationKind)[keyof typeof GrowthNotificationKind];
  title: string;
  body?: string | null;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  dedupeKey: string;
};

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

async function ensureSocialProfile(identityId: string, db: DbClient) {
  const existing = await db.growthSocialProfile.findUnique({ where: { identityId } });
  if (existing) return existing;
  return db.growthSocialProfile.create({ data: { identityId } });
}

function prefsFromProfile(profile: {
  notifyReminder: boolean;
  notifyAchievement: boolean;
  notifyFriend: boolean;
  notifyFight: boolean;
  notifyStreak: boolean;
  notifyResult: boolean;
}): GrowthNotificationPrefs {
  return {
    notifyReminder: profile.notifyReminder,
    notifyAchievement: profile.notifyAchievement,
    notifyFriend: profile.notifyFriend,
    notifyFight: profile.notifyFight,
    notifyStreak: profile.notifyStreak,
    notifyResult: profile.notifyResult,
  };
}

function toDto(row: GrowthNotification): GrowthNotificationDto {
  return {
    id: row.id,
    kind: row.kind as GrowthNotificationDto['kind'],
    title: row.title,
    body: row.body,
    href: row.href,
    entityType: row.entityType,
    entityId: row.entityId,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Soft create — respects prefs + dedupe. Never throws to callers (use tryEmit). */
export async function emitGrowthNotification(
  input: EmitGrowthNotificationInput,
  db: DbClient = defaultPrisma,
): Promise<GrowthNotificationDto | null> {
  const profile = await ensureSocialProfile(input.identityId, db);
  const prefs = prefsFromProfile(profile);
  if (!isGrowthNotifyPrefEnabled(prefs, input.kind)) return null;

  try {
    const row = await db.growthNotification.create({
      data: {
        identityId: input.identityId,
        workspaceId: input.workspaceId ?? null,
        kind: input.kind,
        title: input.title.trim().slice(0, 160),
        body: input.body?.trim().slice(0, 400) || null,
        href: input.href?.slice(0, 240) || null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        dedupeKey: input.dedupeKey.slice(0, 120),
      },
    });
    return toDto(row);
  } catch (err) {
    // Unique dedupe collision = already notified.
    const code = (err as { code?: string })?.code;
    if (code === 'P2002') return null;
    throw err;
  }
}

export async function tryEmitGrowthNotification(
  input: EmitGrowthNotificationInput,
  db: DbClient = defaultPrisma,
): Promise<void> {
  try {
    const dto = await emitGrowthNotification(input, db);
    if (dto) {
      void import('../../telegram/telegram.delivery.js')
        .then(({ tryDeliverTelegramNotification }) =>
          tryDeliverTelegramNotification(input.identityId, {
            type: 'GROWTH',
            title: `🌱 ${dto.title}`,
            message: dto.body ?? '',
            accountType: 'PERSONAL',
            accountId: input.workspaceId ?? undefined,
            entityType: 'GROWTH',
            entityId: dto.id,
            ctaPath: dto.href || '/personal/growth',
          }),
        )
        .catch(() => undefined);
    }
  } catch (err) {
    logger.error('Failed to emit growth notification', {
      identityId: input.identityId,
      kind: input.kind,
      dedupeKey: input.dedupeKey,
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}

async function syncReminders(
  workspaceId: string,
  identityId: string,
  db: DbClient,
  now: Date,
): Promise<void> {
  const profile = await ensureSocialProfile(identityId, db);
  if (!profile.notifyReminder) return;

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { personalProfile: { select: { timezone: true } } },
  });
  const timeZone = workspace?.personalProfile?.timezone || 'Asia/Tashkent';

  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const localHm = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);

  const todos = await db.growthTodo.findMany({
    where: {
      workspaceId,
      dueAt: { gte: now, lte: horizon },
      status: { not: GrowthTodoStatus.DONE },
      remindMinutesBefore: { not: null },
    },
    select: { id: true, title: true, dueAt: true, remindMinutesBefore: true },
    take: 10,
  });

  for (const todo of todos) {
    if (!todo.dueAt || todo.remindMinutesBefore == null) continue;
    const remindAt = new Date(todo.dueAt.getTime() - todo.remindMinutesBefore * 60_000);
    if (remindAt > now) continue;
    await tryEmitGrowthNotification(
      {
        identityId,
        workspaceId,
        kind: GrowthNotificationKind.REMINDER,
        title: todo.title,
        body: 'Vazifa eslatmasi',
        href: '/personal/growth/todos',
        entityType: 'GROWTH_TODO',
        entityId: todo.id,
        dedupeKey: `reminder:todo:${todo.id}:${dayKey}`,
      },
      db,
    );
  }

  const events = await db.growthCalendarEvent.findMany({
    where: {
      workspaceId,
      isCancelled: false,
      startsAt: { gte: now, lte: horizon },
      remindMinutesBefore: { not: null },
    },
    select: { id: true, title: true, startsAt: true, remindMinutesBefore: true },
    take: 10,
  });

  for (const event of events) {
    if (event.remindMinutesBefore == null) continue;
    const remindAt = new Date(event.startsAt.getTime() - event.remindMinutesBefore * 60_000);
    if (remindAt > now) continue;
    await tryEmitGrowthNotification(
      {
        identityId,
        workspaceId,
        kind: GrowthNotificationKind.REMINDER,
        title: event.title,
        body: 'Reja eslatmasi',
        href: '/personal/plan',
        entityType: 'GROWTH_EVENT',
        entityId: event.id,
        dedupeKey: `reminder:event:${event.id}:${dayKey}`,
      },
      db,
    );
  }

  const habits = await db.growthHabit.findMany({
    where: {
      workspaceId,
      isArchived: false,
      reminderEnabled: true,
      reminderTime: { not: null },
    },
    select: { id: true, title: true, reminderTime: true },
    take: 20,
  });

  for (const habit of habits) {
    if (!habit.reminderTime) continue;
    // Fire when local clock has reached reminderTime today (same calendar day).
    if (localHm < habit.reminderTime) continue;
    await tryEmitGrowthNotification(
      {
        identityId,
        workspaceId,
        kind: GrowthNotificationKind.REMINDER,
        title: habit.title,
        body: 'Odat eslatmasi',
        href: '/personal/growth/habits',
        entityType: 'GROWTH_HABIT',
        entityId: habit.id,
        dedupeKey: `reminder:habit:${habit.id}:${dayKey}`,
      },
      db,
    );
  }
}

export async function listGrowthNotifications(
  workspaceId: string,
  identityId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthNotificationsListResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  await syncReminders(workspaceId, identityId, db, now);

  const profile = await ensureSocialProfile(identityId, db);
  const prefs = prefsFromProfile(profile);

  const rows = await db.growthNotification.findMany({
    where: {
      identityId,
      dismissedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    take: GROWTH_NOTIFICATION_LIST_LIMIT,
  });

  const unreadCount = await db.growthNotification.count({
    where: {
      identityId,
      dismissedAt: null,
      readAt: null,
    },
  });

  return {
    items: rows.map(toDto),
    unreadCount,
    prefs,
  };
}

export async function markGrowthNotificationsRead(
  workspaceId: string,
  identityId: string,
  body: MarkGrowthNotificationsRequest,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<{ updated: number }> {
  await assertPersonalWorkspace(workspaceId, db);
  const ids = body.ids?.filter(Boolean);

  const result = await db.growthNotification.updateMany({
    where: {
      identityId,
      dismissedAt: null,
      readAt: null,
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
    },
    data: { readAt: now },
  });

  return { updated: result.count };
}

export async function dismissGrowthNotification(
  workspaceId: string,
  identityId: string,
  notificationId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<void> {
  await assertPersonalWorkspace(workspaceId, db);
  const row = await db.growthNotification.findFirst({
    where: { id: notificationId, identityId },
  });
  if (!row) throw ApiError.notFound('Bildirishnoma topilmadi');
  await db.growthNotification.update({
    where: { id: row.id },
    data: { dismissedAt: now, readAt: row.readAt ?? now },
  });
}

export async function updateGrowthNotificationPrefs(
  workspaceId: string,
  identityId: string,
  body: UpdateGrowthNotificationPrefsRequest,
  db: DbClient = defaultPrisma,
): Promise<GrowthNotificationPrefs> {
  await assertPersonalWorkspace(workspaceId, db);
  await ensureSocialProfile(identityId, db);

  const data: Partial<Record<GrowthNotifyPrefKey, boolean>> = {};
  const keys: GrowthNotifyPrefKey[] = [
    'notifyReminder',
    'notifyAchievement',
    'notifyFriend',
    'notifyFight',
    'notifyStreak',
    'notifyResult',
  ];
  for (const key of keys) {
    if (body[key] !== undefined) data[key] = Boolean(body[key]);
  }
  if (Object.keys(data).length === 0) {
    throw ApiError.badRequest('Kamida bitta pref kerak');
  }

  const updated = await db.growthSocialProfile.update({
    where: { identityId },
    data,
  });
  return prefsFromProfile(updated);
}
