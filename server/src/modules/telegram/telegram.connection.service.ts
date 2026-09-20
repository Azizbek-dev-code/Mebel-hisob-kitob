import type { TelegramConnectionStatus, UpdateTelegramPrefsRequest } from '@furniture-erp/shared';
import type { TelegramConnection as TelegramConnectionRow } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import { listAccountPreferences, seedAccountPreferencesForIdentity } from './telegram.account-pref.service.js';
import type { TelegramPrefBooleanField } from './telegram.types.js';

export type ActivateConnectionInput = {
  identityId: string;
  telegramUserId: string;
  telegramChatId: string;
  username?: string | null;
  firstName?: string | null;
};

export type ActivateConnectionResult =
  | { ok: true; connection: TelegramConnectionRow }
  | { ok: false; reason: 'telegram_user_taken' };

const DISCONNECTED_STATUS: TelegramConnectionStatus = {
  connected: false,
  username: null,
  firstName: null,
  connectedAt: null,
  notifyBusiness: true,
  notifyPersonal: true,
  bizNotifySales: true,
  bizNotifyInventory: true,
  bizNotifyDelivery: true,
  bizNotifyAssembly: true,
  bizNotifyWorkers: true,
  bizNotifyBilling: true,
  bizNotifyImportant: true,
  personalNotifyBudget: true,
  personalNotifyGoals: true,
  personalNotifyRecurring: true,
  personalNotifyDebts: true,
  notifyDailySummaryBusiness: true,
  notifyDailySummaryPersonal: true,
  notifyWeeklySummaryBusiness: true,
  notifyWeeklySummaryPersonal: true,
  notifyMonthlySummaryBusiness: true,
  notifyMonthlySummaryPersonal: true,
  accounts: [],
};

export function toStatusDto(row: TelegramConnectionRow): TelegramConnectionStatus {
  return {
    connected: row.isActive,
    username: row.username,
    firstName: row.firstName,
    connectedAt: row.connectedAt.toISOString(),
    notifyBusiness: row.notifyBusiness,
    notifyPersonal: row.notifyPersonal,
    bizNotifySales: row.bizNotifySales,
    bizNotifyInventory: row.bizNotifyInventory,
    bizNotifyDelivery: row.bizNotifyDelivery,
    bizNotifyAssembly: row.bizNotifyAssembly,
    bizNotifyWorkers: row.bizNotifyWorkers,
    bizNotifyBilling: row.bizNotifyBilling,
    bizNotifyImportant: row.bizNotifyImportant,
    personalNotifyBudget: row.personalNotifyBudget,
    personalNotifyGoals: row.personalNotifyGoals,
    personalNotifyRecurring: row.personalNotifyRecurring,
    personalNotifyDebts: row.personalNotifyDebts,
    notifyDailySummaryBusiness: row.notifyDailySummaryBusiness,
    notifyDailySummaryPersonal: row.notifyDailySummaryPersonal,
    notifyWeeklySummaryBusiness: row.notifyWeeklySummaryBusiness,
    notifyWeeklySummaryPersonal: row.notifyWeeklySummaryPersonal,
    notifyMonthlySummaryBusiness: row.notifyMonthlySummaryBusiness,
    notifyMonthlySummaryPersonal: row.notifyMonthlySummaryPersonal,
    accounts: [],
  };
}

export async function findActiveByIdentity(identityId: string) {
  return prisma.telegramConnection.findFirst({
    where: { identityId, isActive: true },
  });
}

export async function findActiveByTelegramUserId(telegramUserId: string) {
  return prisma.telegramConnection.findFirst({
    where: { telegramUserId, isActive: true },
  });
}

export async function getConnectionStatus(identityId: string): Promise<TelegramConnectionStatus> {
  const row = await prisma.telegramConnection.findUnique({ where: { identityId } });
  if (!row || !row.isActive) {
    return { ...DISCONNECTED_STATUS };
  }
  const status = toStatusDto(row);
  status.accounts = await listAccountPreferences(identityId);
  return status;
}

export async function unlinkConnection(identityId: string): Promise<TelegramConnectionStatus> {
  const row = await prisma.telegramConnection.findUnique({ where: { identityId } });
  if (!row) {
    return { ...DISCONNECTED_STATUS };
  }
  await prisma.telegramConnection.update({
    where: { identityId },
    data: { isActive: false, disconnectedAt: new Date() },
  });
  return { ...DISCONNECTED_STATUS };
}

const PREF_KEYS: TelegramPrefBooleanField[] = [
  'notifyBusiness',
  'notifyPersonal',
  'bizNotifySales',
  'bizNotifyInventory',
  'bizNotifyDelivery',
  'bizNotifyAssembly',
  'bizNotifyWorkers',
  'bizNotifyBilling',
  'bizNotifyImportant',
  'personalNotifyBudget',
  'personalNotifyGoals',
  'personalNotifyRecurring',
  'personalNotifyDebts',
  'notifyDailySummaryBusiness',
  'notifyDailySummaryPersonal',
  'notifyWeeklySummaryBusiness',
  'notifyWeeklySummaryPersonal',
  'notifyMonthlySummaryBusiness',
  'notifyMonthlySummaryPersonal',
];

export async function updateTelegramPrefs(
  identityId: string,
  prefs: UpdateTelegramPrefsRequest,
): Promise<TelegramConnectionStatus> {
  const row = await prisma.telegramConnection.findUnique({ where: { identityId } });
  if (!row || !row.isActive) {
    throw ApiError.badRequest('Telegram hisob ulangach sozlamalarni o‘zgartirish mumkin');
  }

  const data: Partial<Record<TelegramPrefBooleanField, boolean>> = {};
  for (const key of PREF_KEYS) {
    const value = prefs[key];
    if (typeof value === 'boolean') {
      data[key] = value;
    }
  }

  if (prefs.accountPrefs?.length) {
    for (const item of prefs.accountPrefs) {
      if (!item.workspaceId || typeof item.notifyEnabled !== 'boolean') continue;
      await prisma.telegramAccountPreference.upsert({
        where: {
          connectionId_workspaceId: { connectionId: row.id, workspaceId: item.workspaceId },
        },
        create: {
          connectionId: row.id,
          workspaceId: item.workspaceId,
          notifyEnabled: item.notifyEnabled,
        },
        update: { notifyEnabled: item.notifyEnabled },
      });
    }
  }

  if (Object.keys(data).length === 0 && !prefs.accountPrefs?.length) {
    const status = toStatusDto(row);
    status.accounts = await listAccountPreferences(identityId);
    return status;
  }

  const updated =
    Object.keys(data).length > 0
      ? await prisma.telegramConnection.update({
          where: { identityId },
          data,
        })
      : row;
  const status = toStatusDto(updated);
  status.accounts = await listAccountPreferences(identityId);
  return status;
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002',
  );
}

/**
 * Activate or reactivate a connection for this identity.
 * Only an *active* Telegram user on a different identity is treated as taken.
 * Inactive (unlinked / blocked) rows must not block a new account.
 */
export async function activateOrReplaceConnection(
  input: ActivateConnectionInput,
): Promise<ActivateConnectionResult> {
  try {
    const result: ActivateConnectionResult = await prisma.$transaction(async (tx) => {
      const activeByTg = await tx.telegramConnection.findFirst({
        where: { telegramUserId: input.telegramUserId, isActive: true },
      });
      if (activeByTg && activeByTg.identityId !== input.identityId) {
        return { ok: false, reason: 'telegram_user_taken' };
      }

      const existingByIdentity = await tx.telegramConnection.findUnique({
        where: { identityId: input.identityId },
      });

      const common = {
        telegramUserId: input.telegramUserId,
        telegramChatId: input.telegramChatId,
        username: input.username ?? null,
        firstName: input.firstName ?? null,
        isActive: true,
        connectedAt: new Date(),
        lastUsedAt: new Date(),
        disconnectedAt: null,
      };

      if (existingByIdentity) {
        const connection = await tx.telegramConnection.update({
          where: { identityId: input.identityId },
          data: common,
        });
        return { ok: true, connection };
      }

      const connection = await tx.telegramConnection.create({
        data: {
          identityId: input.identityId,
          ...common,
        },
      });
      return { ok: true, connection };
    });
    if (result.ok) {
      await seedAccountPreferencesForIdentity(input.identityId);
    }
    return result;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, reason: 'telegram_user_taken' };
    }
    throw error;
  }
}

export async function deactivateByTelegramUserId(telegramUserId: string): Promise<void> {
  await prisma.telegramConnection.updateMany({
    where: { telegramUserId, isActive: true },
    data: { isActive: false, disconnectedAt: new Date() },
  });
}
