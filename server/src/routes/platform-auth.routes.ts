import {
  ApiErrorCode,
  AuditEntityType,
  AuditEventType,
  UserRole,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { env } from '../config/env.js';
import { clearAuthCookie } from '../lib/auth-cookie.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requirePlatformAdmin } from '../middleware/require-platform-admin.js';
import { validate } from '../middleware/validate.js';
import * as accountSecurity from '../services/account-security.service.js';
import { recordAudit } from '../services/audit.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/http-response.js';
import { changePasswordBodySchema } from '../validators/auth.validators.js';

/**
 * Platform Admin password change.
 * Mounted at `/api/platform/auth` (project convention is `/platform/*`, not `/admin/*`).
 */

const changePasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req, _res, next) => {
    next(
      new ApiError(
        429,
        ApiErrorCode.RATE_LIMITED,
        'Too many password change attempts. Please try again in a few minutes.',
      ),
    );
  },
});

function sessionMetaFrom(req: Request) {
  const forwarded = req.get('x-forwarded-for');
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    null;
  return {
    userAgent: req.get('user-agent') ?? null,
    ipAddress: ip,
  };
}

export const postPlatformAdminChangePassword = asyncHandler(async (req: Request, res: Response) => {
  const user = req.auth;
  if (!user) throw ApiError.unauthorized();
  if (user.role !== UserRole.PLATFORM_ADMIN) {
    throw ApiError.forbidden("Faqat Platform Admin bu amalni bajara oladi");
  }

  const meta = sessionMetaFrom(req);

  try {
    await accountSecurity.changePasswordWithCurrent(user, req.body);
  } catch (error) {
    await recordAudit({
      storeId: user.storeId,
      actorUserId: user.id,
      eventType: AuditEventType.ADMIN_PASSWORD_CHANGE_FAILED,
      entityType: AuditEntityType.USER,
      entityId: user.id,
      summary: 'Platform admin password change failed',
      metadata: {
        status: 'failed',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
    throw error;
  }

  await recordAudit({
    storeId: user.storeId,
    actorUserId: user.id,
    eventType: AuditEventType.ADMIN_PASSWORD_CHANGED,
    entityType: AuditEntityType.USER,
    entityId: user.id,
    summary: 'Platform admin password changed',
    metadata: {
      status: 'success',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });

  clearAuthCookie(res);
  sendSuccess(res, {
    ok: true as const,
    requiresReauth: true as const,
    message: 'Parol o‘zgartirildi. Xavfsizlik sababli qayta tizimga kiring.',
  });
});

export const platformAuthRouter = Router();

platformAuthRouter.post(
  '/change-password',
  requireAuth,
  requirePlatformAdmin,
  changePasswordRateLimiter,
  validate({ body: changePasswordBodySchema }),
  postPlatformAdminChangePassword,
);
