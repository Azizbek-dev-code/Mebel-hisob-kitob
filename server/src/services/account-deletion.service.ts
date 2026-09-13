import {
  ACCOUNT_DELETE_CONFIRMATION,
  ACCOUNT_DELETION_REASON_CODES,
  AuditEntityType,
  AuditEventType,
  UserRole,
  type AccountDeletionItem,
  type AccountDeletionReasonCode,
  type DeleteAccountRequest,
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

export async function deleteOwnAccount(
  actor: { id: string; storeId: string; role: string },
  input: DeleteAccountRequest,
): Promise<void> {
  if (input.confirmation !== ACCOUNT_DELETE_CONFIRMATION) {
    throw ApiError.validation('Confirmation phrase does not match', [
      { field: 'confirmation', message: `Type ${ACCOUNT_DELETE_CONFIRMATION} exactly` },
    ]);
  }

  if (!isDeletionReason(input.reasonCode)) {
    throw ApiError.validation('Select a reason', [
      { field: 'reasonCode', message: 'Select a reason' },
    ]);
  }

  const reasonDetail = input.reasonDetail?.trim() || null;
  if (input.reasonCode === 'OTHER' && !reasonDetail) {
    throw ApiError.validation('Please describe the other reason', [
      { field: 'reasonDetail', message: 'Please describe the other reason' },
    ]);
  }

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
        'Do‘kondagi oxirgi administrator akkauntini o‘chirib bo‘lmaydi. Avval boshqa admin tayinlang.',
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
