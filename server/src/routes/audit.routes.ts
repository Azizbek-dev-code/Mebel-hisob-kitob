import { Router } from 'express';

import { FeatureKey } from '@furniture-erp/shared';

import { listAuditLogs } from '../controllers/audit.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireFeature } from '../middleware/require-feature.js';
import { validate } from '../middleware/validate.js';
import { auditListQuerySchema } from '../validators/audit.validators.js';

/**
 * Read-only audit trail, ADMIN / PLATFORM_ADMIN only.
 *
 * There is deliberately no POST, PATCH or DELETE: rows are appended by the
 * services that perform each mutation, and nothing may edit them afterwards.
 * The store comes from the session, so one store's admin cannot read another's.
 */
export const auditRouter = Router();

auditRouter.use(requireAuth, requireFeature(FeatureKey.AUDIT));

auditRouter.get('/', validate({ query: auditListQuerySchema }), listAuditLogs);
