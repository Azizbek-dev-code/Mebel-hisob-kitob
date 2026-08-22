import type { RequestHandler } from 'express';
import { UserRole } from '@furniture-erp/shared';

import { ApiError } from '../utils/api-error.js';

/**
 * Platform-level gate. Must run after `requireAuth`.
 *
 * Store ADMIN / MANAGER / SELLER / CASHIER / EMPLOYEE must not reach
 * store-creation review endpoints even if the UI hid the links.
 */
export const requirePlatformAdmin: RequestHandler = (req, _res, next) => {
  if (!req.auth) {
    next(ApiError.unauthorized('You must be signed in to do that.'));
    return;
  }

  if (req.auth.role !== UserRole.PLATFORM_ADMIN) {
    next(ApiError.forbidden("Faqat Platform Admin bu bo'limni ko'ra oladi"));
    return;
  }

  next();
};
