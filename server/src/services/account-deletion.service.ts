import {
  ACCOUNT_DELETE_CONFIRMATION,
  BUSINESS_DELETE_CONFIRMATION,
  ACCOUNT_DELETION_REASON_CODES,
  AuditEntityType,
  AuditEventType,
  StoreAccessStatus,
  UserRole,
  WorkspaceStatus,
  WorkspaceType,
  type AccountDeletionItem,
  type AccountDeletionReasonCode,
  type DeleteAccountRequest,
  type DeleteBusinessAccountRequest,
} from '@furniture-erp/shared';
import { randomBytes } from 'node:crypto';

import { hashPassword, verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/api-error.js';
import { recordAudit } from './audit.service.js';

function isDeletionReason(value: string): value is AccountDeletionReasonCode {
  return (ACCOUNT_DELETION_REASON_CODES as readonly string[]).includes(value);
}

function toItem(row: {
  id: string;
  storeId: string | null;
  userId: string | null;
  emailSnapshot: string;
  usernameSnapshot: string | null;
  fullNameSnapshot: string;
  role: string;
  reasonCode: string;
  reasonDetail: string | null;
  createdAt: Date;
}): AccountDeletionItem {
  return {
    id: row.id,
    storeId: row.storeId,
    userId: row.userId,
    emailSnapshot: row.emailSnapshot,
    usernameSnapshot: row.usernameSnapshot,
    fullNameSnapshot: row.fullNameSnapshot,
    role: row.role,
    reasonCode: isDeletionReason(row.reasonCode)
      ? row.reasonCode
      : 'OTHER',
    reasonDetail: row.reasonDetail,
    createdAt: row.createdAt.toISOString(),
  };
}

function assertDeletionInput(
  confirmation: string,
  expected: string,
  reasonCode: string,
  reasonDetail: string | null | undefined,
): string | null {
  if (confirmation !== expected) {
    throw ApiError.validation('Confirmation phrase does not match', [
      { field: 'confirmation', message: `Type ${expected} exactly` },
    ]);
  }

  if (!isDeletionReason(reasonCode)) {
    throw ApiError.validation('Select a reason', [
      { field: 'reasonCode', message: 'Select a reason' },
    ]);
  }

  const detail = reasonDetail?.trim() || null;
  if (reasonCode === 'OTHER' && !detail) {
    throw ApiError.validation('Please describe the other reason', [
      { field: 'reasonDetail', message: 'Please describe the other reason' },
    ]);
  }
  return detail;
}

/**
 * Soft-deletes the signed-in store User only (leave the shop).
 * Never mutates Identity — Personal Finance and other Business workspaces stay intact.
 * Sole store ADMIN must use {@link deleteBusinessAccount} instead of transferring ownership.
 */
export async function deleteOwnAccount(
  actor: { id: string; storeId: string; role: string },
  input: DeleteAccountRequest,
): Promise<void> {
  const reasonDetail = assertDeletionInput(
    input.confirmation,
    ACCOUNT_DELETE_CONFIRMATION,
    input.reasonCode,
    input.reasonDetail,
  );

  const user = await prisma.user.findFirst({
    where: { id: actor.id, storeId: actor.storeId },
    select: {
      id: true,
      storeId: true,
      email: true,
      username: true,
      fullName: true,
      role: true,
      passwordHash: true,
      isActive: true,
      deletedAt: true,
      identityId: true,
    },
  });

  if (!user || user.deletedAt) {
    throw ApiError.notFound('Account not found');
  }

  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw ApiError.unauthorized('Incorrect password.');
  }

  if (user.role === UserRole.PLATFORM_ADMIN) {
    const remaining = await prisma.user.count({
      where: {
        role: UserRole.PLATFORM_ADMIN,
        isActive: true,
        deletedAt: null,
        NOT: { id: user.id },
      },
    });
    if (remaining === 0) {
      throw ApiError.conflict('Cannot delete the last platform administrator');
    }
  }

  if (user.role === UserRole.ADMIN) {
    const remainingAdmins = await prisma.user.count({
      where: {
        storeId: user.storeId,
        role: UserRole.ADMIN,
        isActive: true,
        deletedAt: null,
        NOT: { id: user.id },
      },
    });
    if (remainingAdmins === 0) {
      throw ApiError.conflict(
        'Do‘kondagi oxirgi administrator loginini o‘chirib bo‘lmaydi. Butun Business akkauntni o‘chirish uchun «Business akkauntni o‘chirish» amalidan foydalaning.',
      );
    }
  }

  const scrambledHash = await hashPassword(randomBytes(32).toString('hex'));
  const anonymisedEmail = `deleted.${user.id}@invalid.local`;
  const anonymisedUsername = `del_${user.id}`;

  await prisma.$transaction(async (tx) => {
    await tx.accountDeletion.create({
      data: {
        storeId: user.storeId,
        userId: user.id,
        emailSnapshot: user.email,
        usernameSnapshot: user.username,
        fullNameSnapshot: user.fullName,
        role: user.role,
        reasonCode: input.reasonCode,
        reasonDetail,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        passwordHash: scrambledHash,
        email: anonymisedEmail,
        username: anonymisedUsername,
      },
    });

    await tx.authSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  await recordAudit({
    storeId: user.storeId,
    actorUserId: user.id,
    eventType: AuditEventType.ACCOUNT_DELETED,
    entityType: AuditEntityType.ACCOUNT_DELETION,
    entityId: user.id,
    summary: `Account deleted: ${user.fullName}`,
    metadata: {
      reasonCode: input.reasonCode,
      role: user.role,
      scope: 'user',
    },
  });
}

/**
 * Owner closes the current Business workspace + store.
 * No admin transfer required. Identity and Personal Finance are untouched.
 * Other Business workspaces on the same Identity stay active.
 */
export async function deleteBusinessAccount(
  actor: { id: string; storeId: string; role: string },
  input: DeleteBusinessAccountRequest,
): Promise<void> {
  const reasonDetail = assertDeletionInput(
    input.confirmation,
    BUSINESS_DELETE_CONFIRMATION,
    input.reasonCode,
    input.reasonDetail,
  );

  if (actor.role !== UserRole.ADMIN) {
    throw ApiError.forbidden('Faqat do‘kon egasi Business akkauntni o‘chira oladi');
  }

  const user = await prisma.user.findFirst({
    where: { id: actor.id, storeId: actor.storeId, deletedAt: null, isActive: true },
    select: {
      id: true,
      storeId: true,
      email: true,
      username: true,
      fullName: true,
      role: true,
      passwordHash: true,
      identityId: true,
    },
  });

  if (!user) {
    throw ApiError.notFound('Account not found');
  }

  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw ApiError.unauthorized('Incorrect password.');
  }

  const store = await prisma.store.findUnique({
    where: { id: user.storeId },
    select: { id: true, name: true, isActive: true },
  });
  if (!store) {
    throw ApiError.notFound("Do‘kon topilmadi");
  }

  const scrambledHash = await hashPassword(randomBytes(32).toString('hex'));
  const now = new Date();

  const storeUsers = await prisma.user.findMany({
    where: { storeId: store.id, deletedAt: null },
    select: { id: true, email: true, username: true, fullName: true, role: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const row of storeUsers) {
      await tx.accountDeletion.create({
        data: {
          storeId: store.id,
          userId: row.id,
          emailSnapshot: row.email,
          usernameSnapshot: row.username,
          fullNameSnapshot: row.fullName,
          role: row.role,
          reasonCode: input.reasonCode,
          reasonDetail,
        },
      });

      await tx.user.update({
        where: { id: row.id },
        data: {
          isActive: false,
          deletedAt: now,
          passwordHash: scrambledHash,
          email: `deleted.${row.id}@invalid.local`,
          username: `del_${row.id}`,
        },
      });

      await tx.authSession.updateMany({
        where: { userId: row.id, revokedAt: null },
        data: { revokedAt: now },
      });
    }

    await tx.store.update({
      where: { id: store.id },
      data: {
        isActive: false,
        accessStatus: StoreAccessStatus.MANUALLY_BLOCKED,
      },
    });

    const workspace = await tx.workspace.findUnique({
      where: { storeId: store.id },
      select: { id: true, type: true },
    });

    if (workspace && workspace.type === WorkspaceType.BUSINESS) {
      await tx.workspace.update({
        where: { id: workspace.id },
        data: { status: WorkspaceStatus.ARCHIVED },
      });
      // Drop memberships so the account switcher no longer lists this business.
      await tx.workspaceMembership.deleteMany({
        where: { workspaceId: workspace.id },
      });
    }
  });

  await recordAudit({
    storeId: store.id,
    actorUserId: user.id,
    eventType: AuditEventType.BUSINESS_ACCOUNT_DELETED,
    entityType: AuditEntityType.ACCOUNT_DELETION,
    entityId: store.id,
    summary: `Business account deleted: ${store.name}`,
    metadata: {
      reasonCode: input.reasonCode,
      scope: 'business',
      identityId: user.identityId,
      userCount: storeUsers.length,
      // Explicit: Identity / Personal must remain.
      identityPreserved: true,
    },
  });
}

export async function listAccountDeletions(actorRole: string): Promise<AccountDeletionItem[]> {
  if (actorRole !== UserRole.PLATFORM_ADMIN) {
    throw ApiError.forbidden("Faqat Platform Admin bu bo'limni ko'ra oladi");
  }

  const rows = await prisma.accountDeletion.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return rows.map(toItem);
}

export async function assertAccountNotDeleted(storeId: string, userId: string): Promise<void> {
  const row = await prisma.user.findFirst({
    where: { id: userId, storeId },
    select: { deletedAt: true },
  });
  if (row?.deletedAt) {
    throw ApiError.conflict('This account was deleted and cannot be reactivated');
  }
}
