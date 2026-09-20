import {
  AnalyticsAccountType,
  type AnalyticsEventsBatchRequest,
  type PresenceHeartbeatRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ensureIdentityForUser } from '../accounts/account-layer.service.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { isCronSecretAuthorized } from '../../utils/cron-secret.js';
import { sendSuccess } from '../../utils/http-response.js';

import { getPresenceStatus, recordHeartbeat } from './presence.service.js';
import { tryRecordAnalyticsEvents } from '../usage-analytics/analytics-events.service.js';
import { runUsageAnalyticsMaintenance } from '../usage-analytics/analytics-maintenance.service.js';

async function requireIdentityId(req: Request): Promise<{
  identityId: string;
  accountType: AnalyticsAccountType;
  accountId: string | null;
}> {
  if (req.personalAuth) {
    return {
      identityId: req.personalAuth.identityId,
      accountType: AnalyticsAccountType.PERSONAL,
      accountId: req.personalAuth.workspaceId,
    };
  }
  if (!req.auth) throw ApiError.unauthorized();
  const user = await prisma.user.findUnique({
    where: { id: req.auth.id },
    select: { identityId: true },
  });
  const identityId = user?.identityId ?? (await ensureIdentityForUser(req.auth.id));
  return {
    identityId,
    accountType:
      req.auth.role === 'PLATFORM_ADMIN'
        ? AnalyticsAccountType.PLATFORM
        : AnalyticsAccountType.BUSINESS,
    accountId: req.auth.storeId,
  };
}

export const postHeartbeat = asyncHandler(async (req: Request, res: Response) => {
  const ctx = await requireIdentityId(req);
  const body = req.body as PresenceHeartbeatRequest;
  sendSuccess(
    res,
    await recordHeartbeat(ctx.identityId, {
      ...body,
      accountType: body.accountType ?? ctx.accountType,
      accountId: body.accountId ?? ctx.accountId,
    }),
  );
});

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const ctx = await requireIdentityId(req);
  sendSuccess(res, await getPresenceStatus(ctx.identityId, String(req.params.identityId)));
});

export const postEvents = asyncHandler(async (req: Request, res: Response) => {
  const ctx = await requireIdentityId(req);
  const body = req.body as AnalyticsEventsBatchRequest;
  const stored = await tryRecordAnalyticsEvents(
    ctx.identityId,
    ctx.accountType,
    ctx.accountId,
    body.clientSessionId ?? null,
    body.events ?? [],
  );
  sendSuccess(res, { stored });
});

export const postAnalyticsMaintenanceCron = asyncHandler(async (req: Request, res: Response) => {
  if (!isCronSecretAuthorized(req)) {
    throw ApiError.unauthorized('Cron unauthorized');
  }
  sendSuccess(res, await runUsageAnalyticsMaintenance());
});
