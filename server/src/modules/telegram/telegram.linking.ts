import { createHash, randomBytes } from 'node:crypto';

import { prisma } from '../../lib/prisma.js';
import { canonicalBotUsername } from './telegram.config.js';
import { TELEGRAM_LINKING_TOKEN_TTL_MS, type TelegramLinkingIssue } from './telegram.types.js';

/**
 * One-time, random, expiring linking tokens keyed by Identity.
 *
 * Deep-links look like `https://t.me/<active_bot_username>?start=<token>`.
 * Username MUST be passed from resolveTelegramBotUsername() (DB/getMe) —
 * never a hardcoded bot name.
 * Never put `userId` / `identityId` in that start payload — only the SHA-256
 * hash is stored server-side.
 */

const TOKEN_BYTES = 32;

export function hashTelegramLinkingToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Build `https://t.me/<username>?start=<payload>`.
 * `username` is required — call resolveTelegramBotUsername() first.
 */
export function buildTelegramStartLink(startPayload: string, username: string): string {
  const clean = canonicalBotUsername(username);
  if (!clean) {
    throw new Error('Telegram bot username is required to build a deep-link');
  }
  return `https://t.me/${clean}?start=${encodeURIComponent(startPayload)}`;
}

/**
 * Issues an in-memory linking challenge (no DB). Prefer `createPersistedLinkToken`
 * for the HTTP linking API.
 */
export function issueTelegramLinkingToken(
  identityId: string,
  botUsername: string,
  now = () => new Date(),
): TelegramLinkingIssue {
  const startPayload = randomBytes(TOKEN_BYTES).toString('base64url');
  const issuedAt = now();
  return {
    identityId,
    tokenHash: hashTelegramLinkingToken(startPayload),
    startPayload,
    deepLink: buildTelegramStartLink(startPayload, botUsername),
    expiresAt: new Date(issuedAt.getTime() + TELEGRAM_LINKING_TOKEN_TTL_MS),
  };
}

export type PersistedLinkTokenResult = {
  deepLink: string;
  expiresAt: Date;
  /** Raw start payload — only for building the deep-link URL; never return via HTTP. */
  startPayload: string;
};

/**
 * Create a DB-backed one-time link token (hash only). Invalidates prior unused tokens.
 * `botUsername` must come from resolveTelegramBotUsername() (same source as Admin UI).
 */
export async function createPersistedLinkToken(
  identityId: string,
  botUsername: string,
): Promise<PersistedLinkTokenResult> {
  const issued = issueTelegramLinkingToken(identityId, botUsername);

  await prisma.telegramLinkToken.deleteMany({
    where: {
      identityId,
      usedAt: null,
    },
  });

  await prisma.telegramLinkToken.create({
    data: {
      identityId,
      tokenHash: issued.tokenHash,
      expiresAt: issued.expiresAt,
    },
  });

  return {
    deepLink: issued.deepLink,
    expiresAt: issued.expiresAt,
    startPayload: issued.startPayload,
  };
}

export async function findValidLinkTokenByHash(tokenHash: string) {
  const now = new Date();
  return prisma.telegramLinkToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
  });
}

export async function findValidLinkTokenByPayload(startPayload: string) {
  return findValidLinkTokenByHash(hashTelegramLinkingToken(startPayload));
}

export async function markLinkTokenUsed(tokenId: string): Promise<void> {
  await prisma.telegramLinkToken.update({
    where: { id: tokenId },
    data: { usedAt: new Date() },
  });
}

export type CreatePendingLinkInput = {
  identityId: string;
  tokenHash: string;
  telegramUserId: string;
  telegramChatId: string;
  username?: string | null;
  firstName?: string | null;
};

export async function createPendingLink(input: CreatePendingLinkInput) {
  const expiresAt = new Date(Date.now() + TELEGRAM_LINKING_TOKEN_TTL_MS);
  await deleteExpiredPendingForTelegramUser(input.telegramUserId);
  return prisma.telegramPendingLink.create({
    data: {
      identityId: input.identityId,
      tokenHash: input.tokenHash,
      telegramUserId: input.telegramUserId,
      telegramChatId: input.telegramChatId,
      username: input.username ?? null,
      firstName: input.firstName ?? null,
      expiresAt,
    },
  });
}

export async function getPendingLink(id: string) {
  return prisma.telegramPendingLink.findUnique({ where: { id } });
}

export async function deletePendingLink(id: string): Promise<void> {
  await prisma.telegramPendingLink.deleteMany({ where: { id } });
}

export async function deleteExpiredPendingForTelegramUser(telegramUserId: string): Promise<void> {
  const now = new Date();
  await prisma.telegramPendingLink.deleteMany({
    where: {
      telegramUserId,
      expiresAt: { lte: now },
    },
  });
}
