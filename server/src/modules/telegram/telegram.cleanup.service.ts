import { WorkspaceStatus, WorkspaceType } from '@furniture-erp/shared';
import type { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';
import { sanitizeTelegramLogText } from './telegram.sanitize.js';

type Tx = Prisma.TransactionClient;

/**
 * Count remaining *valid* account contexts for an Identity:
 * - PERSONAL membership on a non-archived workspace
 * - BUSINESS membership on ACTIVE workspace with an active store
 */
export async function countValidTelegramAccountContexts(
  identityId: string,
  db: typeof prisma | Tx = prisma,
): Promise<number> {
  const memberships = await db.workspaceMembership.findMany({
    where: { identityId },
    select: {
      workspace: {
        select: {
          id: true,
          type: true,
          status: true,
          store: { select: { id: true, isActive: true } },
        },
      },
    },
  });

  let count = 0;
  for (const row of memberships) {
    const ws = row.workspace;
    if (ws.status === WorkspaceStatus.ARCHIVED) continue;
    if (ws.type === WorkspaceType.PERSONAL) {
      count += 1;
      continue;
    }
    if (ws.type === WorkspaceType.BUSINESS && ws.store?.isActive) {
      count += 1;
    }
  }
  return count;
}

/** Drop TelegramAccountPreference rows for a workspace (orphans after archive). */
export async function deleteTelegramPrefsForWorkspace(
  workspaceId: string,
  db: typeof prisma | Tx = prisma,
): Promise<number> {
  const result = await db.telegramAccountPreference.deleteMany({
    where: { workspaceId },
  });
  return result.count;
}

/**
 * Soft-unlink Telegram connection + purge unused link tokens / pending links.
 * Prefs cascade when connection is hard-deleted; here we keep the row (soft unlink)
 * but clear prefs so orphan workspace refs do not linger.
 */
export async function unlinkTelegramForIdentity(
  identityId: string,
  db: typeof prisma | Tx = prisma,
): Promise<boolean> {
  const connection = await db.telegramConnection.findUnique({
    where: { identityId },
    select: { id: true, isActive: true },
  });
  if (!connection) {
    await db.telegramLinkToken.deleteMany({ where: { identityId, usedAt: null } });
    await db.telegramPendingLink.deleteMany({ where: { identityId } });
    return false;
  }

  if (connection.isActive) {
    await db.telegramConnection.update({
      where: { identityId },
      data: { isActive: false, disconnectedAt: new Date() },
    });
  }

  await db.telegramAccountPreference.deleteMany({ where: { connectionId: connection.id } });
  await db.telegramLinkToken.deleteMany({ where: { identityId, usedAt: null } });
  await db.telegramPendingLink.deleteMany({ where: { identityId } });
  return true;
}

/**
 * After a Business workspace is archived / memberships dropped:
 * 1. Delete Telegram prefs for that workspace
 * 2. If Identity has no remaining valid contexts → full Telegram unlink
 *
 * Does NOT unlink when Personal or another Business still exists.
 */
export async function cleanupTelegramAfterBusinessDeleted(opts: {
  identityId: string | null | undefined;
  workspaceId: string | null | undefined;
  db?: typeof prisma | Tx;
}): Promise<{ prefsDeleted: number; connectionUnlinked: boolean }> {
  const db = opts.db ?? prisma;
  let prefsDeleted = 0;
  let connectionUnlinked = false;

  try {
    if (opts.workspaceId) {
      prefsDeleted = await deleteTelegramPrefsForWorkspace(opts.workspaceId, db);
    }

    if (opts.identityId) {
      const remaining = await countValidTelegramAccountContexts(opts.identityId, db);
      if (remaining === 0) {
        connectionUnlinked = await unlinkTelegramForIdentity(opts.identityId, db);
      }
    }
  } catch (error) {
    logger.warn('Telegram cleanup after business delete failed', {
      identityId: opts.identityId,
      workspaceId: opts.workspaceId,
      message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
    });
  }

  return { prefsDeleted, connectionUnlinked };
}

/**
 * Soft-delete of a single store User does not remove Identity contexts.
 * No Telegram unlink — other Businesses / Personal stay linked.
 * Only cleans prefs if this identity no longer has a membership for the store's workspace
 * (e.g. sole membership was already dropped elsewhere).
 */
export async function cleanupTelegramAfterUserAccountDeleted(opts: {
  identityId: string | null | undefined;
  storeId: string | null | undefined;
  db?: typeof prisma | Tx;
}): Promise<{ prefsDeleted: number; connectionUnlinked: boolean }> {
  const db = opts.db ?? prisma;
  if (!opts.identityId) return { prefsDeleted: 0, connectionUnlinked: false };

  try {
    let prefsDeleted = 0;
    if (opts.storeId) {
      const workspace = await db.workspace.findUnique({
        where: { storeId: opts.storeId },
        select: { id: true },
      });
      if (workspace) {
        const stillMember = await db.workspaceMembership.findFirst({
          where: { identityId: opts.identityId, workspaceId: workspace.id },
          select: { id: true },
        });
        if (!stillMember) {
          prefsDeleted = await deleteTelegramPrefsForWorkspace(workspace.id, db);
        }
      }
    }

    const remaining = await countValidTelegramAccountContexts(opts.identityId, db);
    if (remaining === 0) {
      const connectionUnlinked = await unlinkTelegramForIdentity(opts.identityId, db);
      return { prefsDeleted, connectionUnlinked };
    }
    return { prefsDeleted, connectionUnlinked: false };
  } catch (error) {
    logger.warn('Telegram cleanup after user account delete failed', {
      identityId: opts.identityId,
      storeId: opts.storeId,
      message: sanitizeTelegramLogText(error instanceof Error ? error.message : String(error)),
    });
    return { prefsDeleted: 0, connectionUnlinked: false };
  }
}
