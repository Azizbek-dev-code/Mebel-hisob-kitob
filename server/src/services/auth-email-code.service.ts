import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import type { AuthEmailCodePurpose } from '@furniture-erp/shared';

import { env } from '../config/env.js';
import { prisma as defaultPrisma } from '../lib/prisma.js';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';
import { sendTransactionalEmail } from './mailer.service.js';

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_ACTIVE_PER_HOUR = 5;

export function hashEmailCode(code: string): string {
  return createHmac('sha256', env.JWT_ACCESS_SECRET).update(code).digest('hex');
}

function codesMatch(plain: string, storedHash: string): boolean {
  const computed = hashEmailCode(plain);
  const a = Buffer.from(computed, 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

type CodeRow = {
  id: string;
  email: string;
  purpose: string;
  codeHash: string;
  newEmail: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
  attemptCount: number;
  identityId: string | null;
};

function isUsable(row: CodeRow, now: Date): boolean {
  return !row.consumedAt && row.expiresAt.getTime() > now.getTime() && row.attemptCount < MAX_ATTEMPTS;
}

export async function issueEmailCode(input: {
  email: string;
  purpose: AuthEmailCodePurpose;
  identityId?: string | null;
  newEmail?: string | null;
  subject: string;
  body: (code: string) => string;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const recent = await defaultPrisma.authEmailCode.count({
    where: { email, purpose: input.purpose, createdAt: { gte: hourAgo } },
  });
  if (recent >= MAX_ACTIVE_PER_HOUR) {
    throw ApiError.tooManyRequests('Too many requests. Try again later.');
  }

  await defaultPrisma.authEmailCode.updateMany({
    where: { email, purpose: input.purpose, consumedAt: null },
    data: { consumedAt: now },
  });

  const code = sixDigitCode();
  await defaultPrisma.authEmailCode.create({
    data: {
      email,
      purpose: input.purpose,
      codeHash: hashEmailCode(code),
      newEmail: input.newEmail ?? null,
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      identityId: input.identityId ?? null,
    },
  });

  await sendTransactionalEmail({
    to: email,
    subject: input.subject,
    text: input.body(code),
    codeForDevLog: code,
  });
}

export async function consumeEmailCode(input: {
  email: string;
  purpose: AuthEmailCodePurpose;
  code: string;
}): Promise<CodeRow> {
  const email = input.email.trim().toLowerCase();
  const code = input.code.trim();
  const now = new Date();

  const row = await defaultPrisma.authEmailCode.findFirst({
    where: { email, purpose: input.purpose },
    orderBy: { createdAt: 'desc' },
  });

  if (!row) {
    throw ApiError.badRequest('Invalid or expired code');
  }

  if (!isUsable(row, now)) {
    throw ApiError.badRequest('Invalid or expired code');
  }

  if (!codesMatch(code, row.codeHash)) {
    const nextAttempts = row.attemptCount + 1;
    await defaultPrisma.authEmailCode.update({
      where: { id: row.id },
      data: {
        attemptCount: nextAttempts,
        consumedAt: nextAttempts >= MAX_ATTEMPTS ? now : row.consumedAt,
      },
    });
    throw ApiError.badRequest('Invalid or expired code');
  }

  const consumed = await defaultPrisma.authEmailCode.update({
    where: { id: row.id },
    data: { consumedAt: now },
  });

  logger.info('Email code consumed', { purpose: input.purpose, email });
  return consumed;
}
