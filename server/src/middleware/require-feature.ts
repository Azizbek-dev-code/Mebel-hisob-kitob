import { UserRole } from '@furniture-erp/shared';
import type { RequestHandler } from 'express';

import { assertCanUseFeature } from '../services/entitlement.service.js';
import { ApiError } from '../utils/api-error.js';

/**
 * Plan gate for a whole module. Must run after `requireAuth`.
 *
 * Write paths already assert entitlements inside their service, but reads did
 * not, so a store on a plan without `reports` could still fetch every report by
 * calling the API directly. Hiding a sidebar link is a UI convenience, never the
 * boundary — this middleware is the boundary.
 *
 * PLATFORM_ADMIN is exempt: it operates the control plane and holds no plan.
 */
export function requireFeature(featureKey: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(ApiError.unauthorized('You must be signed in to do that.'));
      return;
    }
    if (req.auth.role === UserRole.PLATFORM_ADMIN) {
      next();
      return;
    }
    assertCanUseFeature(req.auth.storeId, featureKey).then(() => next(), next);
  };
}
