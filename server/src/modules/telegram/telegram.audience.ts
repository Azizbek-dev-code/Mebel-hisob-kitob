import {
  TelegramBroadcastAudience,
  WorkspaceType,
} from '@furniture-erp/shared';

import { prisma } from '../../lib/prisma.js';

export type AudienceConnection = {
  id: string;
  telegramUserId: string;
  telegramChatId: string;
};

function hasPersonal(memberships: Array<{ workspace: { type: string } }>): boolean {
  return memberships.some((row) => row.workspace.type === WorkspaceType.PERSONAL);
}

function hasBusiness(
  memberships: Array<{ workspace: { type: string } }>,
  users: Array<{ storeId: string | null }>,
): boolean {
  return (
    memberships.some((row) => row.workspace.type === WorkspaceType.BUSINESS) ||
    users.some((row) => Boolean(row.storeId))
  );
}

export async function resolveAudienceConnections(
  audience: TelegramBroadcastAudience = TelegramBroadcastAudience.ALL,
  _filter?: Record<string, unknown> | null,
): Promise<AudienceConnection[]> {
  const rows = await prisma.telegramConnection.findMany({
    where: { isActive: true },
    select: {
      id: true,
      telegramUserId: true,
      telegramChatId: true,
      identity: {
        select: {
          memberships: { select: { workspace: { select: { type: true } } } },
          users: { select: { storeId: true } },
        },
      },
    },
  });

  return rows
    .filter((row) => {
      const personal = hasPersonal(row.identity.memberships);
      const business = hasBusiness(row.identity.memberships, row.identity.users);
      switch (audience) {
        case TelegramBroadcastAudience.PERSONAL:
          return personal;
        case TelegramBroadcastAudience.BUSINESS:
          return business;
        case TelegramBroadcastAudience.PERSONAL_AND_BUSINESS:
          return personal && business;
        default:
          return true;
      }
    })
    .map((row) => ({
      id: row.id,
      telegramUserId: row.telegramUserId,
      telegramChatId: row.telegramChatId,
    }));
}
