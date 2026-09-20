import {
  AuditEntityType,
  AuditEventType,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_TELEGRAM_TIMEZONE,
  TelegramBroadcastAudience,
  TelegramBroadcastRecipientStatus,
  TelegramBroadcastStatus,
  type CreateTelegramBroadcastRequest,
  type TelegramBroadcastDetail,
  type TelegramBroadcastListResponse,
  type TelegramBroadcastSummary,
} from '@furniture-erp/shared';

import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '@prisma/client';
import { recordAudit } from '../../services/audit.service.js';
import { ApiError } from '../../utils/api-error.js';
import { logger } from '../../utils/logger.js';
import { deactivateByTelegramUserId } from './telegram.connection.service.js';
import { mediaKindFromUrl, previewTitle, sendTelegramContent } from './telegram.content.js';
import { readTelegramRuntime } from './telegram.config.js';
import { resolveAudienceConnections } from './telegram.audience.js';
import { sanitizeTelegramLogText } from './telegram.sanitize.js';
import { parseScheduledAt } from './telegram.timezone.js';
import {
  TELEGRAM_BROADCAST_BATCH_DELAY_MS,
  TELEGRAM_BROADCAST_BATCH_SIZE,
  TELEGRAM_BROADCAST_TICK_MAX_MS,
} from './telegram.types.js';

let kickRunning = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function previewText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 120);
}

function toSummary(row: {
  id: string;
  title: string | null;
  name?: string | null;
  text: string;
  status: TelegramBroadcastStatus;
  audience?: TelegramBroadcastAudience | null;
  timezone?: string | null;
  scheduledAt?: Date | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: Date;
  completedAt: Date | null;
}): TelegramBroadcastSummary {
  return {
    id: row.id,
    title: row.title,
    name: row.name ?? row.title,
    preview: previewText(row.text),
    status: row.status,
    audience: row.audience ?? TelegramBroadcastAudience.ALL,
    timezone: row.timezone || DEFAULT_TELEGRAM_TIMEZONE,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    totalRecipients: row.totalRecipients,
    sentCount: row.sentCount,
    failedCount: row.failedCount,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export async function listBroadcasts(
  page = DEFAULT_PAGE,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<TelegramBroadcastListResponse> {
  const [rows, totalItems] = await Promise.all([
    prisma.telegramBroadcast.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.telegramBroadcast.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);
  return {
    items: rows.map((row) => toSummary(row)),
    meta: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function getBroadcast(id: string): Promise<TelegramBroadcastDetail> {
  const row = await prisma.telegramBroadcast.findUnique({ where: { id } });
  if (!row) throw ApiError.notFound('Broadcast topilmadi');
  return {
    ...toSummary(row),
    text: row.text,
    mediaKind: row.mediaKind,
    imageUrl: row.imageUrl,
    buttonText: row.buttonText,
    buttonUrl: row.buttonUrl,
  };
}

async function snapshotRecipients(
  broadcastId: string,
  audience: TelegramBroadcastAudience,
  audienceFilter: Record<string, unknown> | null | undefined,
): Promise<number> {
  const connections = await resolveAudienceConnections(audience, audienceFilter);
  if (connections.length === 0) {
    await prisma.telegramBroadcast.update({
      where: { id: broadcastId },
      data: { totalRecipients: 0 },
    });
    return 0;
  }
  await prisma.telegramBroadcastRecipient.createMany({
    data: connections.map((connection) => ({
      broadcastId,
      connectionId: connection.id,
      telegramUserId: connection.telegramUserId,
      telegramChatId: connection.telegramChatId,
      status: TelegramBroadcastRecipientStatus.PENDING,
    })),
    skipDuplicates: true,
  });
  await prisma.telegramBroadcast.update({
    where: { id: broadcastId },
    data: { totalRecipients: connections.length },
  });
  return connections.length;
}

export async function createBroadcast(
  actorUserId: string,
  body: CreateTelegramBroadcastRequest,
): Promise<TelegramBroadcastDetail> {
  const runtime = readTelegramRuntime();
  if (!runtime.configured) {
    throw ApiError.badRequest('Telegram bot sozlanmagan');
  }

  const imageUrl = body.imageUrl?.trim() || null;
  const text = body.text.trim();
  const timezone = body.timezone?.trim() || DEFAULT_TELEGRAM_TIMEZONE;
  const audience = body.audience ?? TelegramBroadcastAudience.ALL;
  const scheduledAt = body.scheduledAt ? parseScheduledAt(body.scheduledAt, timezone) : null;
  const sendNow = body.sendNow !== false && !scheduledAt;
  const status = scheduledAt && scheduledAt.getTime() > Date.now()
    ? TelegramBroadcastStatus.SCHEDULED
    : sendNow
      ? TelegramBroadcastStatus.PENDING
      : TelegramBroadcastStatus.DRAFT;
  const name = body.name?.trim() || previewTitle(text);

  const broadcast = await prisma.telegramBroadcast.create({
    data: {
      title: name,
      name,
      text,
      mediaKind: mediaKindFromUrl(imageUrl),
      imageUrl,
      buttonText: body.buttonText?.trim() || null,
      buttonUrl: body.buttonUrl?.trim() || null,
      audience,
      audienceFilter: (body.audienceFilter ?? undefined) as Prisma.InputJsonValue | undefined,
      timezone,
      scheduledAt,
      status,
      createdById: actorUserId,
    },
  });

  if (status === TelegramBroadcastStatus.PENDING) {
    await snapshotRecipients(broadcast.id, audience, body.audienceFilter);
  }

  await recordAudit({
    storeId: null,
    actorUserId,
    eventType:
      status === TelegramBroadcastStatus.SCHEDULED
        ? AuditEventType.TELEGRAM_BROADCAST_SCHEDULED
        : AuditEventType.TELEGRAM_BROADCAST_CREATED,
    entityType: AuditEntityType.TELEGRAM_BROADCAST,
    entityId: broadcast.id,
    summary:
      status === TelegramBroadcastStatus.SCHEDULED
        ? 'Telegram broadcast scheduled'
        : 'Telegram broadcast created',
    metadata: { status, audience, timezone },
  });

  if (status === TelegramBroadcastStatus.PENDING) {
    void kickBroadcastProcessing();
  }
  return getBroadcast(broadcast.id);
}

export async function cancelBroadcast(actorUserId: string, id: string): Promise<TelegramBroadcastDetail> {
  const row = await prisma.telegramBroadcast.findUnique({ where: { id } });
  if (!row) throw ApiError.notFound('Broadcast topilmadi');
  if (
    row.status !== TelegramBroadcastStatus.DRAFT &&
    row.status !== TelegramBroadcastStatus.SCHEDULED &&
    row.status !== TelegramBroadcastStatus.PENDING
  ) {
    throw ApiError.badRequest('Bu broadcastni bekor qilib bo‘lmaydi');
  }
  await prisma.telegramBroadcast.update({
    where: { id },
    data: {
      status: TelegramBroadcastStatus.CANCELLED,
      cancelledAt: new Date(),
    },
  });
  await recordAudit({
    storeId: null,
    actorUserId,
    eventType: AuditEventType.TELEGRAM_BROADCAST_CANCELLED,
    entityType: AuditEntityType.TELEGRAM_BROADCAST,
    entityId: id,
    summary: 'Telegram broadcast cancelled',
  });
  return getBroadcast(id);
}

async function markBroadcastFinished(broadcastId: string, actorUserId?: string | null): Promise<void> {
  const remaining = await prisma.telegramBroadcastRecipient.count({
    where: {
      broadcastId,
      status: {
        in: [TelegramBroadcastRecipientStatus.PENDING, TelegramBroadcastRecipientStatus.SENDING],
      },
    },
  });
  if (remaining > 0) return;

  const [sentCount, failedCount] = await Promise.all([
    prisma.telegramBroadcastRecipient.count({
      where: { broadcastId, status: TelegramBroadcastRecipientStatus.SENT },
    }),
    prisma.telegramBroadcastRecipient.count({
      where: {
        broadcastId,
        status: { in: [TelegramBroadcastRecipientStatus.FAILED, TelegramBroadcastRecipientStatus.SKIPPED] },
      },
    }),
  ]);

  const row = await prisma.telegramBroadcast.update({
    where: { id: broadcastId },
    data: {
      status: TelegramBroadcastStatus.COMPLETED,
      sentCount,
      failedCount,
      completedAt: new Date(),
    },
  });

  await recordAudit({
    storeId: null,
    actorUserId: actorUserId ?? row.createdById,
    eventType: AuditEventType.TELEGRAM_BROADCAST_SENT,
    entityType: AuditEntityType.TELEGRAM_BROADCAST,
    entityId: broadcastId,
    summary: 'Telegram broadcast completed',
    metadata: { sentCount, failedCount },
  });
}

async function processOneRecipient(recipient: {
  id: string;
  broadcastId: string;
  telegramUserId: string;
  telegramChatId: string;
  text: string;
  imageUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
}): Promise<'sent' | 'failed' | 'skipped'> {
  const claimed = await prisma.telegramBroadcastRecipient.updateMany({
    where: {
      id: recipient.id,
      status: {
        in: [TelegramBroadcastRecipientStatus.PENDING, TelegramBroadcastRecipientStatus.SENDING],
      },
    },
    data: { status: TelegramBroadcastRecipientStatus.SENDING },
  });
  if (claimed.count !== 1) return 'skipped';

  const active = await prisma.telegramConnection.findFirst({
    where: { telegramUserId: recipient.telegramUserId, isActive: true },
    select: { id: true },
  });
  if (!active) {
    await prisma.telegramBroadcastRecipient.update({
      where: { id: recipient.id },
      data: { status: TelegramBroadcastRecipientStatus.SKIPPED, error: 'inactive' },
    });
    return 'skipped';
  }

  const result = await sendTelegramContent(recipient.telegramChatId, {
    text: recipient.text,
    imageUrl: recipient.imageUrl,
    buttonText: recipient.buttonText,
    buttonUrl: recipient.buttonUrl,
  });

  if (result.ok) {
    await prisma.telegramBroadcastRecipient.update({
      where: { id: recipient.id },
      data: { status: TelegramBroadcastRecipientStatus.SENT, sentAt: new Date(), error: null },
    });
    await prisma.telegramBroadcast.update({
      where: { id: recipient.broadcastId },
      data: { sentCount: { increment: 1 } },
    });
    return 'sent';
  }

  if (result.reason === 'blocked') {
    await deactivateByTelegramUserId(recipient.telegramUserId);
  }

  await prisma.telegramBroadcastRecipient.update({
    where: { id: recipient.id },
    data: {
      status: TelegramBroadcastRecipientStatus.FAILED,
      error: result.reason,
    },
  });
  await prisma.telegramBroadcast.update({
    where: { id: recipient.broadcastId },
    data: { failedCount: { increment: 1 } },
  });
  return 'failed';
}

async function processBroadcastBatch(broadcastId: string): Promise<boolean> {
  const broadcast = await prisma.telegramBroadcast.findUnique({ where: { id: broadcastId } });
  if (!broadcast) return false;
  if (
    broadcast.status !== TelegramBroadcastStatus.PENDING &&
    broadcast.status !== TelegramBroadcastStatus.SENDING
  ) {
    return false;
  }

  if (broadcast.status === TelegramBroadcastStatus.PENDING) {
    await prisma.telegramBroadcast.update({
      where: { id: broadcastId },
      data: { status: TelegramBroadcastStatus.SENDING, startedAt: broadcast.startedAt ?? new Date() },
    });
  }

  const recipients = await prisma.telegramBroadcastRecipient.findMany({
    where: {
      broadcastId,
      status: {
        in: [TelegramBroadcastRecipientStatus.PENDING, TelegramBroadcastRecipientStatus.SENDING],
      },
    },
    take: TELEGRAM_BROADCAST_BATCH_SIZE,
    orderBy: { createdAt: 'asc' },
  });

  if (recipients.length === 0) {
    await markBroadcastFinished(broadcastId, broadcast.createdById);
    return false;
  }

  for (const recipient of recipients) {
    await processOneRecipient({
      id: recipient.id,
      broadcastId,
      telegramUserId: recipient.telegramUserId,
      telegramChatId: recipient.telegramChatId,
      text: broadcast.text,
      imageUrl: broadcast.imageUrl,
      buttonText: broadcast.buttonText,
      buttonUrl: broadcast.buttonUrl,
    });
  }

  const remaining = await prisma.telegramBroadcastRecipient.count({
    where: {
      broadcastId,
      status: {
        in: [TelegramBroadcastRecipientStatus.PENDING, TelegramBroadcastRecipientStatus.SENDING],
      },
    },
  });
  await markBroadcastFinished(broadcastId, broadcast.createdById);
  return remaining > 0;
}

export async function processBroadcastQueue(): Promise<{ processed: boolean }> {
  const due = await prisma.telegramBroadcast.findMany({
    where: {
      status: TelegramBroadcastStatus.SCHEDULED,
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: 'asc' },
  });
  for (const broadcast of due) {
    await snapshotRecipients(broadcast.id, broadcast.audience, broadcast.audienceFilter as Record<string, unknown> | null);
    await prisma.telegramBroadcast.update({
      where: { id: broadcast.id },
      data: { status: TelegramBroadcastStatus.PENDING },
    });
  }

  const deadline = Date.now() + TELEGRAM_BROADCAST_TICK_MAX_MS;
  let processed = false;
  while (Date.now() < deadline) {
    const broadcast = await prisma.telegramBroadcast.findFirst({
      where: {
        status: { in: [TelegramBroadcastStatus.PENDING, TelegramBroadcastStatus.SENDING] },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!broadcast) break;
    const didWork = await processBroadcastBatch(broadcast.id);
    processed = processed || didWork;
    if (!didWork) break;
    if (Date.now() + TELEGRAM_BROADCAST_BATCH_DELAY_MS >= deadline) break;
    await sleep(TELEGRAM_BROADCAST_BATCH_DELAY_MS);
  }
  return { processed };
}

export async function kickBroadcastProcessing(): Promise<void> {
  if (kickRunning) return;
  kickRunning = true;
  try {
    await processBroadcastQueue();
    const remaining = await prisma.telegramBroadcast.count({
      where: { status: { in: [TelegramBroadcastStatus.PENDING, TelegramBroadcastStatus.SENDING] } },
    });
    if (remaining > 0) {
      setTimeout(() => {
        kickRunning = false;
        void kickBroadcastProcessing();
      }, TELEGRAM_BROADCAST_BATCH_DELAY_MS).unref?.();
      return;
    }
  } catch (error) {
    logger.warn('Telegram broadcast tick failed', {
      message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
    });
    try {
      const open = await prisma.telegramBroadcast.findFirst({
        where: { status: { in: [TelegramBroadcastStatus.PENDING, TelegramBroadcastStatus.SENDING] } },
        select: { id: true, createdById: true },
      });
      if (open) {
        await recordAudit({
          storeId: null,
          actorUserId: open.createdById,
          eventType: AuditEventType.TELEGRAM_BROADCAST_FAILED,
          entityType: AuditEntityType.TELEGRAM_BROADCAST,
          entityId: open.id,
          summary: 'Telegram broadcast tick failed',
        });
      }
    } catch (auditError) {
      logger.warn('Telegram broadcast failure audit skipped', {
        message: sanitizeTelegramLogText(
          auditError instanceof Error ? auditError.message : String(auditError),
        ),
      });
    }
  }
  kickRunning = false;
}

/** Test helper */
export function resetBroadcastKickLock(): void {
  kickRunning = false;
}
