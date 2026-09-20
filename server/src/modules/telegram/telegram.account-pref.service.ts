import { WorkspaceType, type TelegramAccountPref } from '@furniture-erp/shared';

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';
import { sanitizeTelegramLogText } from './telegram.sanitize.js';

export async function seedAccountPreferencesForIdentity(identityId: string): Promise<void> {
  try {
    const connection = await prisma.telegramConnection.findUnique({
      where: { identityId },
      select: { id: true },
    });
    if (!connection) return;

    const memberships = await prisma.workspaceMembership.findMany({
      where: { identityId },
      select: { workspaceId: true },
    });
    if (memberships.length === 0) return;

    await prisma.telegramAccountPreference.createMany({
      data: memberships.map((row) => ({
        connectionId: connection.id,
        workspaceId: row.workspaceId,
        notifyEnabled: true,
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    logger.warn('Telegram account pref seed failed', {
      identityId,
      message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
    });
  }
}

export async function ensurePrefForWorkspace(identityId: string, workspaceId: string): Promise<void> {
  try {
    const connection = await prisma.telegramConnection.findUnique({
      where: { identityId },
      select: { id: true },
    });
    if (!connection) return;
    await prisma.telegramAccountPreference.upsert({
      where: {
        connectionId_workspaceId: { connectionId: connection.id, workspaceId },
      },
      create: { connectionId: connection.id, workspaceId, notifyEnabled: true },
      update: {},
    });
  } catch (error) {
    logger.warn('Telegram account pref ensure failed', {
      identityId,
      workspaceId,
      message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
    });
  }
}

export async function listAccountPreferences(identityId: string): Promise<TelegramAccountPref[]> {
  const connection = await prisma.telegramConnection.findUnique({
    where: { identityId },
    select: { id: true, isActive: true },
  });
  if (!connection?.isActive) return [];

  const memberships = await prisma.workspaceMembership.findMany({
    where: { identityId },
    include: {
      workspace: {
        select: {
          id: true,
          type: true,
          name: true,
          storeId: true,
          store: { select: { name: true, businessType: true } },
        },
      },
    },
  });

  const prefs = await prisma.telegramAccountPreference.findMany({
    where: { connectionId: connection.id },
    select: { workspaceId: true, notifyEnabled: true },
  });
  const prefMap = new Map(prefs.map((row) => [row.workspaceId, row.notifyEnabled]));

  return memberships.map((row) => ({
    workspaceId: row.workspace.id,
    type: row.workspace.type === WorkspaceType.PERSONAL ? 'PERSONAL' : 'BUSINESS',
    name: row.workspace.store?.name || row.workspace.name,
    storeId: row.workspace.storeId,
    businessType: row.workspace.store?.businessType ?? null,
    notifyEnabled: prefMap.get(row.workspace.id) ?? true,
  }));
}

export async function isWorkspaceNotifyEnabled(
  connectionId: string,
  workspaceId: string | null | undefined,
): Promise<boolean> {
  if (!workspaceId) return true;
  const pref = await prisma.telegramAccountPreference.findUnique({
    where: { connectionId_workspaceId: { connectionId, workspaceId } },
    select: { notifyEnabled: true },
  });
  return pref?.notifyEnabled ?? true;
}

export async function workspaceIdForStore(storeId: string): Promise<string | null> {
  const row = await prisma.workspace.findUnique({
    where: { storeId },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function personalWorkspaceIdForIdentity(identityId: string): Promise<string | null> {
  const row = await prisma.workspaceMembership.findFirst({
    where: { identityId, workspace: { type: WorkspaceType.PERSONAL } },
    select: { workspaceId: true },
  });
  return row?.workspaceId ?? null;
}
