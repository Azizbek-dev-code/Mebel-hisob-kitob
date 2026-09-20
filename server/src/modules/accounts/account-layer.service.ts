import {
  UserRole,
  WorkspaceMembershipRole,
  WorkspaceStatus,
  WorkspaceType,
} from '@furniture-erp/shared';
import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';
import { attachBusinessOnboardingWorkspace } from '../personal-finance/onboarding/onboarding-attach.service.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface AccountLayerBackfillResult {
  identitiesCreated: number;
  workspacesCreated: number;
  membershipsCreated: number;
}

function membershipRoleForUserRole(role: string): WorkspaceMembershipRole | null {
  if (role === UserRole.PLATFORM_ADMIN) return null;
  if (role === UserRole.ADMIN) return WorkspaceMembershipRole.OWNER;
  return WorkspaceMembershipRole.MEMBER;
}

export async function ensureIdentityForUser(userId: string, db: DbClient = defaultPrisma): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, identityId: true },
  });
  if (!user) {
    throw new Error(`Cannot ensure identity: user ${userId} not found`);
  }
  if (user.identityId) return user.identityId;

  const identity = await db.identity.create({
    data: { email: user.email, fullName: user.fullName },
    select: { id: true },
  });

  const assigned = await db.user.updateMany({
    where: { id: userId, identityId: null },
    data: { identityId: identity.id },
  });

  if (assigned.count === 0) {
    const raced = await db.user.findUnique({
      where: { id: userId },
      select: { identityId: true },
    });
    await db.identity.delete({ where: { id: identity.id } }).catch(() => undefined);
    if (raced?.identityId) return raced.identityId;
    throw new Error(`Cannot ensure identity: user ${userId} lost the identity assignment`);
  }

  return identity.id;
}

export async function ensureBusinessWorkspaceForStore(
  storeId: string,
  db: DbClient = defaultPrisma,
): Promise<string> {
  const existing = await db.workspace.findUnique({
    where: { storeId },
    select: { id: true },
  });
  if (existing) return existing.id;

  const store = await db.store.findUnique({
    where: { id: storeId },
    select: { id: true, name: true },
  });
  if (!store) {
    throw new Error(`Cannot ensure workspace: store ${storeId} not found`);
  }

  try {
    const created = await db.workspace.create({
      data: {
        type: WorkspaceType.BUSINESS,
        name: store.name,
        status: WorkspaceStatus.ACTIVE,
        storeId: store.id,
      },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    const raced = await db.workspace.findUnique({
      where: { storeId },
      select: { id: true },
    });
    if (raced) return raced.id;
    throw error;
  }
}

export async function ensureMembership(
  identityId: string,
  workspaceId: string,
  role: WorkspaceMembershipRole,
  db: DbClient = defaultPrisma,
): Promise<void> {
  const existing = await db.workspaceMembership.findUnique({
    where: { identityId_workspaceId: { identityId, workspaceId } },
    select: { id: true },
  });
  if (existing) return;

  try {
    await db.workspaceMembership.create({
      data: { identityId, workspaceId, role },
    });
    void import('../telegram/telegram.account-pref.service.js')
      .then(({ ensurePrefForWorkspace }) => ensurePrefForWorkspace(identityId, workspaceId))
      .catch(() => undefined);
  } catch {
    const raced = await db.workspaceMembership.findUnique({
      where: { identityId_workspaceId: { identityId, workspaceId } },
      select: { id: true },
    });
    if (raced) return;
    throw new Error(`Cannot ensure membership for identity ${identityId} on workspace ${workspaceId}`);
  }
}

/**
 * Links a store User onto the BUSINESS workspace for their store.
 * PLATFORM_ADMIN receives an Identity but no store membership.
 */
export async function ensureUserOnBusinessWorkspace(
  userId: string,
  db: DbClient = defaultPrisma,
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, storeId: true, role: true },
  });
  if (!user) {
    throw new Error(`Cannot ensure account layer: user ${userId} not found`);
  }

  const identityId = await ensureIdentityForUser(user.id, db);
  const membershipRole = membershipRoleForUserRole(user.role);
  if (!membershipRole) return;

  const workspaceId = await ensureBusinessWorkspaceForStore(user.storeId, db);
  await ensureMembership(identityId, workspaceId, membershipRole, db);
  try {
    await attachBusinessOnboardingWorkspace(identityId, workspaceId, db);
  } catch (error) {
    logger.warn('Could not attach business onboarding to workspace', {
      identityId,
      workspaceId,
      reason: error instanceof Error ? error.message : 'unknown',
    });
  }
}

/**
 * Idempotent backfill for existing stores and users. Safe to run on boot/seed.
 * Does not create PERSONAL workspaces and does not read StoreSubscription.
 */
export async function backfillAccountLayer(
  db: DbClient = defaultPrisma,
): Promise<AccountLayerBackfillResult> {
  const result: AccountLayerBackfillResult = {
    identitiesCreated: 0,
    workspacesCreated: 0,
    membershipsCreated: 0,
  };

  const storesMissingWorkspace = await db.store.findMany({
    where: { workspace: null },
    select: { id: true },
  });
  for (const store of storesMissingWorkspace) {
    await ensureBusinessWorkspaceForStore(store.id, db);
    result.workspacesCreated += 1;
  }

  const usersMissingIdentity = await db.user.findMany({
    where: { identityId: null },
    select: { id: true },
  });
  for (const user of usersMissingIdentity) {
    await ensureIdentityForUser(user.id, db);
    result.identitiesCreated += 1;
  }

  const usersForMembership = await db.user.findMany({
    where: {
      identityId: { not: null },
      role: { not: UserRole.PLATFORM_ADMIN },
    },
    select: { id: true, storeId: true, role: true, identityId: true },
  });

  for (const user of usersForMembership) {
    if (!user.identityId) continue;
    const membershipRole = membershipRoleForUserRole(user.role);
    if (!membershipRole) continue;
    const workspaceId = await ensureBusinessWorkspaceForStore(user.storeId, db);
    const existing = await db.workspaceMembership.findUnique({
      where: {
        identityId_workspaceId: { identityId: user.identityId, workspaceId },
      },
      select: { id: true },
    });
    if (existing) continue;
    await ensureMembership(user.identityId, workspaceId, membershipRole, db);
    result.membershipsCreated += 1;
  }

  return result;
}

/** Best-effort wrapper so ERP writes never fail because the overlay lagged. */
export async function tryEnsureUserOnBusinessWorkspace(userId: string): Promise<void> {
  try {
    await ensureUserOnBusinessWorkspace(userId);
  } catch (error) {
    logger.warn('Could not ensure account layer for user', {
      userId,
      reason: error instanceof Error ? error.message : 'unknown',
    });
  }
}
