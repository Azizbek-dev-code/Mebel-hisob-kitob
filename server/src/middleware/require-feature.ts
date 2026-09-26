import { UserRole } from '@furniture-erp/shared';
import type { RequestHandler } from 'express';

import { snapshotAllowsFeature } from '../repositories/user.repository.js';
import { ApiError } from '../utils/api-error.js';

/**
 * Plan gate for a whole module. Must run after `requireAuth`.
 *
 * Write paths already assert entitlements inside their service, but reads did
 * not, so a store on a plan without `reports` could still fetch every report by
 * calling the API directly. Hiding a sidebar link is a UI convenience, never the
 * boundary — this middleware is the boundary.
 *
 * Uses the subscription snapshot already loaded on `req.auth` during
 * authenticate() so feature-gated reads do not re-query plan features.
 * PLATFORM_ADMIN is exempt: it operates the control plane and holds no plan.
 *
 * Expiry persistence still runs on write/billing paths that call
 * getCurrentSubscription(); this gate only checks the auth-time snapshot.
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
    if (!snapshotAllowsFeature(req.auth.subscription, featureKey)) {
      if (req.auth.subscription && !req.auth.subscription.canWrite) {
        next(ApiError.subscriptionRequired());
        return;
      }
      next(ApiError.featureNotIncluded());
      return;
    }
    next();
  };
}
