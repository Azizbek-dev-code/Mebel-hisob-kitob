import {
  AuditEntityType,
  AuditEventType,
  StoreCreationRequestStatus,
  WorkspaceMembershipRole,
  WorkspaceStatus,
  WorkspaceType,
  applicantFullName,
  defaultPersonalWorkspaceName,
  normalizeEmail,
  normalizePersonName,
  type AccountWorkspaceItem,
  type CreatePersonalAccountRequest,
  type IdentitySummary,
  type PersonalAccountCreatedResponse,
  type RegisterPersonalAccountRequest,
  type WorkspaceSummary,
} from '@furniture-erp/shared';
import type { Prisma, PrismaClient } from '@prisma/client';

import { hashPassword } from '../../lib/password.js';
import { prisma as defaultPrisma } from '../../lib/prisma.js';
import { recordAudit } from '../../services/audit.service.js';
import { assertPasswordNotCompromised } from '../../services/security/compromised-password.service.js';
import { ApiError } from '../../utils/api-error.js';
import {
  ensureIdentityForUser,
  ensureUserOnBusinessWorkspace,
} from './account-layer.service.js';
import { trialSubscriptionCreateData } from '../personal-finance/billing/personal-subscription.service.js';
import { attributeRegistration, ensureReferralCode, markReferralAccountCreated } from '../referrals/referral.service.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

function toIdentitySummary(row: {
  id: string;
  email: string;
  fullName: string;
  createdAt: Date;
}): IdentitySummary {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    createdAt: row.createdAt.toISOString(),
  };
}

function toWorkspaceSummary(row: {
  id: string;
  type: WorkspaceType;
  name: string;
  status: WorkspaceStatus;
  storeId: string | null;
  createdAt: Date;
}): WorkspaceSummary {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    status: row.status,
    storeId: row.storeId,
    createdAt: row.createdAt.toISOString(),
  };
}

function resolveWorkspaceName(fullName: string, name?: string): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  return defaultPersonalWorkspaceName(fullName);
}

async function assertEmailAvailable(email: string, db: DbClient): Promise<void> {
  const [identity, user, pendingRequest] = await Promise.all([
    db.identity.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    }),
    db.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    }),
    db.storeCreationRequest.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        status: StoreCreationRequestStatus.PENDING,
      },
      select: { id: true },
    }),
  ]);

  if (identity || user || pendingRequest) {
    throw ApiError.conflict('Bu email allaqachon ishlatilgan');
  }
}

/**
 * Public Personal signup. Creates Identity + PERSONAL workspace only.
 * Does not create a Store, User, or StoreSubscription, and does not issue a session.
 */
export async function registerPersonalAccount(
  input: RegisterPersonalAccountRequest & {
    referralCode?: string | null;
    visitorKey?: string | null;
  },
  db: PrismaClient = defaultPrisma,
): Promise<PersonalAccountCreatedResponse> {
  const firstName = normalizePersonName(input.firstName);
  const lastName = normalizePersonName(input.lastName);
  const email = normalizeEmail(input.email);
  const fullName = applicantFullName(firstName, lastName);
  const name = resolveWorkspaceName(fullName, input.name);

  await assertEmailAvailable(email, db);
  await assertPasswordNotCompromised(input.password);
  const passwordHash = await hashPassword(input.password);

  const created = await db.$transaction(async (tx) => {
    await assertEmailAvailable(email, tx);

    const identity = await tx.identity.create({
      data: { email, fullName, passwordHash },
      select: { id: true, email: true, fullName: true, createdAt: true },
    });

    const workspace = await tx.workspace.create({
      data: {
        type: WorkspaceType.PERSONAL,
        name,
        status: WorkspaceStatus.ACTIVE,
      },
      select: {
        id: true,
        type: true,
        name: true,
        status: true,
        storeId: true,
        createdAt: true,
      },
    });

    await tx.workspaceMembership.create({
      data: {
        identityId: identity.id,
        workspaceId: workspace.id,
        role: WorkspaceMembershipRole.OWNER,
      },
    });

    await tx.personalSubscription.create({
      data: trialSubscriptionCreateData(workspace.id),
    });

    return { identity, workspace };
  });

  await attributeRegistration(
    {
      referredIdentityId: created.identity.id,
      referredWorkspaceId: created.workspace.id,
      code: input.referralCode,
      visitorKey: input.visitorKey,
    },
    db,
  );
  await ensureReferralCode(created.identity.id, db);

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.PERSONAL_ACCOUNT_REGISTERED,
    entityType: AuditEntityType.WORKSPACE,
    entityId: created.workspace.id,
    summary: `Personal account registered: ${created.workspace.name}`,
    metadata: { identityId: created.identity.id, email },
  });

  return {
    identity: toIdentitySummary(created.identity),
    workspace: toWorkspaceSummary(created.workspace),
  };
}

/**
 * Signed-in ERP user adds a PERSONAL workspace on their existing Identity.
 * Never creates a Store or a StoreSubscription.
 */
export async function createPersonalAccountForUser(
  userId: string,
  input: CreatePersonalAccountRequest & {
    referralCode?: string | null;
    visitorKey?: string | null;
  },
  db: PrismaClient = defaultPrisma,
): Promise<PersonalAccountCreatedResponse> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, identityId: true },
  });
  if (!user) {
    throw ApiError.notFound('Account not found');
  }

  const created = await db.$transaction(async (tx) => {
    const identityId = await ensureIdentityForUser(userId, tx);
    const identity = await tx.identity.findUnique({
      where: { id: identityId },
      select: { id: true, email: true, fullName: true, createdAt: true },
    });
    if (!identity) {
      throw ApiError.notFound('Account not found');
    }

    const existingPersonal = await tx.workspaceMembership.findFirst({
      where: {
        identityId: identity.id,
        workspace: { type: WorkspaceType.PERSONAL, status: WorkspaceStatus.ACTIVE },
      },
      select: { id: true },
    });
    if (existingPersonal) {
      throw ApiError.conflict('Shaxsiy moliya hisobi allaqachon bor');
    }

    const workspace = await tx.workspace.create({
      data: {
        type: WorkspaceType.PERSONAL,
        name: resolveWorkspaceName(identity.fullName, input.name),
        status: WorkspaceStatus.ACTIVE,
      },
      select: {
        id: true,
        type: true,
        name: true,
        status: true,
        storeId: true,
        createdAt: true,
      },
    });

    await tx.workspaceMembership.create({
      data: {
        identityId: identity.id,
        workspaceId: workspace.id,
        role: WorkspaceMembershipRole.OWNER,
      },
    });

    await tx.personalSubscription.create({
      data: trialSubscriptionCreateData(workspace.id),
    });

    return { identity, workspace };
  });

  await attributeRegistration(
    {
      referredIdentityId: created.identity.id,
      referredWorkspaceId: created.workspace.id,
      code: input.referralCode,
      visitorKey: input.visitorKey,
    },
    db,
  );
  await markReferralAccountCreated(created.identity.id, created.workspace.id, db);
  await ensureReferralCode(created.identity.id, db);

  await recordAudit({
    storeId: null,
    actorUserId: userId,
    eventType: AuditEventType.PERSONAL_ACCOUNT_CREATED,
    entityType: AuditEntityType.WORKSPACE,
    entityId: created.workspace.id,
    summary: `Personal account created: ${created.workspace.name}`,
    metadata: { identityId: created.identity.id },
  });

  return {
    identity: toIdentitySummary(created.identity),
    workspace: toWorkspaceSummary(created.workspace),
  };
}

/** Workspaces the signed-in store user's Identity may see. Never leaks other identities. */
export async function listWorkspacesForUser(
  userId: string,
  db: PrismaClient = defaultPrisma,
): Promise<AccountWorkspaceItem[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, identityId: true },
  });
  if (!user) {
    throw ApiError.notFound('Account not found');
  }

  await ensureUserOnBusinessWorkspace(userId, db);

  const linked = await db.user.findUnique({
    where: { id: userId },
    select: { identityId: true },
  });
  if (!linked?.identityId) {
    return [];
  }

  const rows = await db.workspaceMembership.findMany({
    where: { identityId: linked.identityId, workspace: { status: WorkspaceStatus.ACTIVE } },
    include: {
      workspace: {
        select: {
          id: true,
          type: true,
          name: true,
          status: true,
          storeId: true,
          createdAt: true,
          store: { select: { businessType: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map((row) => ({
    ...toWorkspaceSummary(row.workspace),
    role: row.role,
    businessType: row.workspace.store?.businessType ?? null,
  }));
}

/** Workspaces the signed-in Identity may see. Never leaks other identities. */
export async function listWorkspacesForIdentity(
  identityId: string,
  db: PrismaClient = defaultPrisma,
): Promise<AccountWorkspaceItem[]> {
  const rows = await db.workspaceMembership.findMany({
    where: { identityId, workspace: { status: WorkspaceStatus.ACTIVE } },
    include: {
      workspace: {
        select: {
          id: true,
          type: true,
          name: true,
          status: true,
          storeId: true,
          createdAt: true,
          store: { select: { businessType: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map((row) => ({
    ...toWorkspaceSummary(row.workspace),
    role: row.role,
    businessType: row.workspace.store?.businessType ?? null,
  }));
}
