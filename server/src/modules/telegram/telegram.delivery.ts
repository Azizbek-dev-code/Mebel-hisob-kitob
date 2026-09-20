import type { UserRole } from '@furniture-erp/shared';
import type { TelegramConnection } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';
import {
  isWorkspaceNotifyEnabled,
  personalWorkspaceIdForIdentity,
  workspaceIdForStore,
} from './telegram.account-pref.service.js';
import { deactivateByTelegramUserId, findActiveByIdentity } from './telegram.connection.service.js';
import { formatTelegramNotification } from './telegram.notification.js';
import type { TelegramNotificationPayload } from './telegram.cta.js';
import { sendTelegramMessage } from './telegram.service.js';
import { sanitizeTelegramLogText } from './telegram.sanitize.js';
import type { TelegramInlineKeyboardMarkup } from './telegram.types.js';
import type { TelegramPrefBooleanField } from './telegram.types.js';

export type TelegramDeliveryChannel = 'business' | 'personal';

export type TryDeliverTelegramOpts = {
  identityId: string;
  channel: TelegramDeliveryChannel;
  /** e.g. bizNotifySales / personalNotifyBudget — skipped when false */
  prefField?: TelegramPrefBooleanField;
  text: string;
  workspaceId?: string | null;
  storeId?: string | null;
  replyMarkup?: TelegramInlineKeyboardMarkup;
};

function channelMasterOn(row: TelegramConnection, channel: TelegramDeliveryChannel): boolean {
  return channel === 'business' ? row.notifyBusiness : row.notifyPersonal;
}

function prefEnabled(row: TelegramConnection, prefField?: TelegramPrefBooleanField): boolean {
  if (!prefField) return true;
  return Boolean(row[prefField]);
}

/**
 * Best-effort Telegram delivery. Never throws to the caller.
 */
export async function tryDeliverTelegram(opts: TryDeliverTelegramOpts): Promise<void> {
  try {
    const row = await findActiveByIdentity(opts.identityId);
    if (!row) return;
    if (!channelMasterOn(row, opts.channel)) return;
    if (!prefEnabled(row, opts.prefField)) return;

    let workspaceId = opts.workspaceId ?? null;
    if (!workspaceId && opts.storeId) {
      workspaceId = await workspaceIdForStore(opts.storeId);
    }
    if (!workspaceId && opts.channel === 'personal') {
      workspaceId = await personalWorkspaceIdForIdentity(opts.identityId);
    }
    if (!(await isWorkspaceNotifyEnabled(row.id, workspaceId))) return;

    const result = opts.replyMarkup
      ? await sendTelegramMessage(row.telegramChatId, opts.text, opts.replyMarkup)
      : await sendTelegramMessage(row.telegramChatId, opts.text);
    if (!result.ok && result.reason === 'blocked') {
      await deactivateByTelegramUserId(row.telegramUserId);
      return;
    }
    if (!result.ok) {
      logger.warn('Telegram delivery failed', {
        identityId: opts.identityId,
        channel: opts.channel,
        reason: result.reason,
      });
    }
  } catch (error) {
    logger.warn('Telegram delivery error', {
      identityId: opts.identityId,
      channel: opts.channel,
      message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
    });
  }
}

export type TryDeliverTelegramToStoreUsersOpts = {
  prefField?: TelegramPrefBooleanField;
  text: string;
  storeId?: string;
  workspaceId?: string | null;
  replyMarkup?: TelegramInlineKeyboardMarkup;
  onlyRoles?: UserRole[];
};

/**
 * Fan-out a business-channel message to all store users that have an Identity.
 */
export async function tryDeliverTelegramToStoreUsers(
  storeId: string,
  opts: TryDeliverTelegramToStoreUsersOpts,
): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: {
        storeId,
        identityId: { not: null },
        ...(opts.onlyRoles?.length ? { role: { in: opts.onlyRoles } } : {}),
      },
      select: { identityId: true },
    });

    const identityIds = [
      ...new Set(users.map((u) => u.identityId).filter((id): id is string => Boolean(id))),
    ];

    await Promise.all(
      identityIds.map((identityId) =>
        tryDeliverTelegram({
          identityId,
          channel: 'business',
          prefField: opts.prefField,
          text: opts.text,
          storeId,
          workspaceId: opts.workspaceId,
          replyMarkup: opts.replyMarkup,
        }),
      ),
    );
  } catch (error) {
    logger.warn('Telegram store fan-out failed', {
      storeId,
      message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
    });
  }
}

export async function tryDeliverTelegramNotification(
  identityId: string,
  payload: TelegramNotificationPayload,
  prefField?: TelegramPrefBooleanField,
): Promise<void> {
  const formatted = formatTelegramNotification(payload);
  await tryDeliverTelegram({
    identityId,
    channel: payload.accountType === 'BUSINESS' ? 'business' : 'personal',
    prefField,
    text: formatted.text,
    workspaceId: payload.accountType === 'PERSONAL' ? payload.accountId : undefined,
    storeId: payload.accountType === 'BUSINESS' ? payload.accountId : undefined,
    replyMarkup: formatted.keyboard,
  });
}

export async function tryDeliverBusinessNotification(
  storeId: string,
  payload: TelegramNotificationPayload,
  prefField?: TelegramPrefBooleanField,
): Promise<void> {
  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, businessType: true },
    });
    const formatted = formatTelegramNotification({
      ...payload,
      accountType: 'BUSINESS',
      accountId: storeId,
      accountName: payload.accountName ?? store?.name,
      businessType: payload.businessType ?? store?.businessType,
    });
    await tryDeliverTelegramToStoreUsers(storeId, {
      prefField,
      text: formatted.text,
      replyMarkup: formatted.keyboard,
    });
  } catch (error) {
    logger.warn('Telegram business notification failed', {
      storeId,
      type: payload.type,
      message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
    });
  }
}
