import { Router } from 'express';

import {
  getStoreRequest,
  getStoreRequestSummary,
  listStoreRequests,
  postApproveStoreRequest,
  postRejectStoreRequest,
} from '../controllers/store-creation.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requirePlatformAdmin } from '../middleware/require-platform-admin.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validators/common.validators.js';
import {
  rejectStoreCreationBodySchema,
  storeCreationRequestListQuerySchema,
} from '../validators/store-creation.validators.js';

/**
 * PLATFORM_ADMIN-only store-creation inbox.
 *
 * Role is enforced here and again in the service. A store ADMIN cookie is 403.
 */
export const platformStoreRequestsRouter = Router();

platformStoreRequestsRouter.use(requireAuth, requirePlatformAdmin);

platformStoreRequestsRouter.get(
  '/',
  validate({ query: storeCreationRequestListQuerySchema }),
  listStoreRequests,
);
platformStoreRequestsRouter.get('/summary', getStoreRequestSummary);
platformStoreRequestsRouter.get('/:id', validate({ params: idParamsSchema }), getStoreRequest);
platformStoreRequestsRouter.post(
  '/:id/approve',
  validate({ params: idParamsSchema }),
  postApproveStoreRequest,
);
platformStoreRequestsRouter.post(
  '/:id/reject',
  validate({ params: idParamsSchema, body: rejectStoreCreationBodySchema }),
  postRejectStoreRequest,
);
