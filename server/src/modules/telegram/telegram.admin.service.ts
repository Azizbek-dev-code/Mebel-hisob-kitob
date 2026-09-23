import {
  AuditEntityType,
  AuditEventType,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  TelegramMediaKind,
  TelegramTokenSource,
  type TelegramAdminBotStatus,
  type TelegramAdminConnectedUsersResponse,
  type TelegramStartMessageDto,
  type UpdateTelegramStartMessageRequest,
} from '@furniture-erp/shared';

import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '@prisma/client';
import { getStorageDriver } from '../../lib/storage/index.js';
import { PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGE_MIME_TYPES } from '../../lib/storage/types.js';
import { recordAudit } from '../../services/audit.service.js';
import { ApiError } from '../../utils/api-error.js';
import { logger } from '../../utils/logger.js';
import { applyTelegramDbRuntime, getPublicAppUrl, getTelegramWebhookUrl, readTelegramRuntime } from './telegram.config.js';
import { decryptTelegramSecret, encryptTelegramSecret } from './telegram.crypto.js';
import { mediaKindFromUrl } from './telegram.content.js';
import {
  ensureTelegramWebhookOnce,
  getTelegramWebhookInfo,
  inspectTelegramBotToken,
  resetTelegramHealthCache,
  resetTelegramWebhookEnsureCache,
  setTelegramWebhook,
} from './telegram.service.js';
import { defaultStartContent, startButtonsForSave, toStartMessageDto } from './telegram.menu.js';
import { DEFAULT_TELEGRAM_START_TEXT } from './telegram.types.js';

const BOT_CONFIG_ID = 'default';
const START_MESSAGE_ID = 'default';

function applyBotConfigRow(row: {
  encryptedBotToken: string | null;
  botUsername: string | null;
} | null): void {
  if (!row?.encryptedBotToken) return;
  try {
    const token = decryptTelegramSecret(row.encryptedBotToken);
    applyTelegramDbRuntime({ token, botUsername: row.botUsername });
  } catch (error) {
    logger.warn('Telegram DB token hydrate failed; falling back to env', {
      message: error instanceof Error ? error.message : 'decrypt_failed',
    });
  }
}

export async function hydrateTelegramRuntimeFromDb(): Promise<void> {
  try {
    const row = await prisma.telegramBotConfig.findUnique({ where: { id: BOT_CONFIG_ID } });
    applyBotConfigRow(row);
  } catch (error) {
    logger.warn('Telegram DB token hydrate failed; falling back to env', {
      message: error instanceof Error ? error.message : 'hydrate_failed',
    });
  }
}

function tokenSourceFromConfig(hasDatabaseToken: boolean, envConfigured: boolean): TelegramTokenSource {
  if (hasDatabaseToken) return TelegramTokenSource.DATABASE;
  if (envConfigured) return TelegramTokenSource.ENV;
  return TelegramTokenSource.NONE;
}

export async function getAdminBotStatus(): Promise<TelegramAdminBotStatus> {
  const config = await prisma.telegramBotConfig.findUnique({ where: { id: BOT_CONFIG_ID } });
  applyBotConfigRow(config);
  const runtime = readTelegramRuntime();
  if (runtime.configured) {
    await ensureTelegramWebhookOnce();
  }
  const connectedUsers = await prisma.telegramConnection.count({ where: { isActive: true } });
  const hasDatabaseToken = Boolean(config?.encryptedBotToken);
  const source = tokenSourceFromConfig(hasDatabaseToken, runtime.configured);

  let webhook: TelegramAdminBotStatus['webhook'] = {
    url: '',
    configuredUrl: getTelegramWebhookUrl(),
    active: false,
    pendingUpdateCount: 0,
    lastErrorMessage: null,
    lastCheckedAt: new Date().toISOString(),
  };

  let connected = false;
  if (runtime.configured) {
    const info = await getTelegramWebhookInfo();
    webhook.lastCheckedAt = new Date().toISOString();
    if (info.ok) {
      connected = true;
      webhook = {
        ...webhook,
        url: info.url,
        active: Boolean(info.url),
        pendingUpdateCount: info.pendingUpdateCount,
        lastErrorMessage: info.lastErrorMessage,
      };
    }
  }

  const username = config?.botUsername || runtime.expectedUsername || null;

  return {
    connected: connected && runtime.configured,
    botUsername: username ? `@${username.replace(/^@/, '')}` : null,
    botFirstName: config?.botFirstName ?? null,
    tokenConfigured: runtime.configured,
    tokenSource: source,
    hasDatabaseToken,
    publicAppUrl: getPublicAppUrl(),
    webhook,
    connectedUsers,
    lastValidatedAt: config?.lastValidatedAt?.toISOString() ?? null,
  };
}

export async function updateAdminBotToken(actorUserId: string, token: string): Promise<TelegramAdminBotStatus> {
  const inspected = await inspectTelegramBotToken(token);
  if (!inspected.ok) {
    throw ApiError.badRequest('Token noto‘g‘ri');
  }

  const encryptedBotToken = encryptTelegramSecret(token);
  const now = new Date();
  await prisma.telegramBotConfig.upsert({
    where: { id: BOT_CONFIG_ID },
    create: {
      id: BOT_CONFIG_ID,
      encryptedBotToken,
      botUsername: inspected.bot.username,
      botFirstName: inspected.bot.firstName,
      isActive: true,
      lastValidatedAt: now,
    },
    update: {
      encryptedBotToken,
      botUsername: inspected.bot.username,
      botFirstName: inspected.bot.firstName,
      isActive: true,
      lastValidatedAt: now,
    },
  });

  applyTelegramDbRuntime({ token, botUsername: inspected.bot.username });
  resetTelegramHealthCache();
  resetTelegramWebhookEnsureCache();

  const runtime = readTelegramRuntime();
  if (runtime.token && runtime.webhookSecret) {
    await setTelegramWebhook();
  }

  await recordAudit({
    storeId: null,
    actorUserId,
    eventType: AuditEventType.TELEGRAM_BOT_TOKEN_UPDATED,
    entityType: AuditEntityType.TELEGRAM_BOT,
    entityId: BOT_CONFIG_ID,
    summary: 'Telegram bot token updated',
    metadata: { botUsername: inspected.bot.username },
  });

  return getAdminBotStatus();
}

export async function getAdminStartMessage(): Promise<TelegramStartMessageDto> {
  const row = await prisma.telegramStartMessage.findUnique({ where: { id: START_MESSAGE_ID } });
  if (!row) {
    const fallback = defaultStartContent();
    return {
      id: START_MESSAGE_ID,
      text: fallback.text || DEFAULT_TELEGRAM_START_TEXT,
      mediaKind: TelegramMediaKind.NONE,
      imageUrl: null,
      buttonText: fallback.buttonText ?? null,
      buttonUrl: fallback.buttonUrl ?? null,
      buttons: startButtonsForSave({
        text: fallback.text || DEFAULT_TELEGRAM_START_TEXT,
        mediaKind: TelegramMediaKind.NONE,
        imageUrl: null,
        buttonText: fallback.buttonText ?? null,
        buttonUrl: fallback.buttonUrl ?? null,
      }),
      updatedAt: new Date(0).toISOString(),
    };
  }
  return toStartMessageDto(row);
}

export async function updateAdminStartMessage(
  actorUserId: string,
  body: UpdateTelegramStartMessageRequest,
): Promise<TelegramStartMessageDto> {
  const imageUrl = body.imageUrl?.trim() || null;
  const buttons = startButtonsForSave(body);
  const urlButton = buttons.find((button) => button.action === 'URL' && button.url);
  const data = {
    text: body.text.trim(),
    mediaKind: mediaKindFromUrl(imageUrl),
    imageUrl,
    buttonText: urlButton?.text ?? body.buttonText?.trim() ?? null,
    buttonUrl: urlButton?.url ?? body.buttonUrl?.trim() ?? null,
    buttons: buttons as unknown as Prisma.InputJsonValue,
    isActive: true,
  };

  const row = await prisma.telegramStartMessage.upsert({
    where: { id: START_MESSAGE_ID },
    create: { id: START_MESSAGE_ID, ...data },
    update: data,
  });

  await recordAudit({
    storeId: null,
    actorUserId,
    eventType: AuditEventType.TELEGRAM_START_MESSAGE_UPDATED,
    entityType: AuditEntityType.TELEGRAM_START_MESSAGE,
    entityId: START_MESSAGE_ID,
    summary: 'Telegram /start message updated',
    metadata: { hasImage: Boolean(imageUrl), hasButton: Boolean(data.buttonUrl) },
  });

  return toStartMessageDto(row);
}

export async function listAdminConnectedUsers(
  page = DEFAULT_PAGE,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<TelegramAdminConnectedUsersResponse> {
  const where = { isActive: true as const };
  const [rows, totalItems] = await Promise.all([
    prisma.telegramConnection.findMany({
      where,
      include: { identity: { select: { fullName: true, email: true } } },
      orderBy: { connectedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.telegramConnection.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);
  return {
    items: rows.map((row) => ({
      id: row.id,
      username: row.username,
      firstName: row.firstName,
      identityName: row.identity.fullName,
      identityEmail: row.identity.email,
      connectedAt: row.connectedAt.toISOString(),
    })),
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

export async function uploadAdminTelegramMedia(file: {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}): Promise<{ url: string }> {
  if (!PRODUCT_IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw ApiError.validation('Rasm formati qo‘llab-quvvatlanmaydi', [
      { field: 'image', message: 'jpeg, png, webp yoki gif yuklang' },
    ]);
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw ApiError.validation('Rasm hajmi katta', [
      { field: 'image', message: 'Maksimal 2 MB' },
    ]);
  }
  const stored = await getStorageDriver().upload({
    folder: 'telegram',
    filename: file.originalname,
    buffer: file.buffer,
    contentType: file.mimetype,
  });
  return { url: stored.url };
}

export async function getAdminTelegramStats() {
  const [
    connectedUsers,
    inactiveUsers,
    memberships,
    broadcastsTotal,
    broadcastsScheduled,
    lastBroadcast,
    automationsEnabled,
  ] = await Promise.all([
    prisma.telegramConnection.count({ where: { isActive: true } }),
    prisma.telegramConnection.count({ where: { isActive: false } }),
    prisma.telegramConnection.findMany({
      where: { isActive: true },
      select: {
        identity: {
          select: {
            memberships: { select: { workspace: { select: { type: true } } } },
          },
        },
      },
    }),
    prisma.telegramBroadcast.count(),
    prisma.telegramBroadcast.count({ where: { status: 'SCHEDULED' } }),
    prisma.telegramBroadcast.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    }),
    prisma.telegramAutoMessage.count({ where: { enabled: true } }),
  ]);

  let personalConnected = 0;
  let businessConnected = 0;
  let bothConnected = 0;
  for (const row of memberships) {
    const types = new Set(row.identity.memberships.map((item) => item.workspace.type));
    const personal = types.has('PERSONAL');
    const business = types.has('BUSINESS');
    if (personal) personalConnected += 1;
    if (business) businessConnected += 1;
    if (personal && business) bothConnected += 1;
  }

  return {
    connectedUsers,
    inactiveUsers,
    personalConnected,
    businessConnected,
    bothConnected,
    broadcastsTotal,
    broadcastsScheduled,
    lastBroadcastAt: lastBroadcast?.completedAt?.toISOString() ?? null,
    automationsEnabled,
  };
}
