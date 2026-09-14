import { Router } from 'express';
import multer from 'multer';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { PRODUCT_IMAGE_MAX_BYTES } from '../../../lib/storage/types.js';
import { idParamsSchema } from '../../../validators/common.validators.js';
import { requestPersonalSubscriptionBodySchema } from '../../../validators/platform-billing.validators.js';
import {
  getBilling,
  getMyRequests,
  getPaymentInstructions,
  postCancelMyRequest,
  postPaymentProof,
  postPaymentRequest,
  postSelectPlan,
  postTrialWelcomeSeen,
} from './personal-billing.controller.js';
import { selectPersonalPlanBodySchema } from './personal-billing.validators.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PRODUCT_IMAGE_MAX_BYTES, files: 1 },
});

export const personalBillingRouter = Router();
personalBillingRouter.use(requireAuth, requirePersonalSession);
personalBillingRouter.get('/billing', getBilling);
personalBillingRouter.get('/billing/payment-instructions', getPaymentInstructions);
personalBillingRouter.get('/billing/requests', getMyRequests);
personalBillingRouter.post('/billing/trial-welcome-seen', postTrialWelcomeSeen);
personalBillingRouter.post(
  '/billing/select',
  validate({ body: selectPersonalPlanBodySchema }),
  postSelectPlan,
);
personalBillingRouter.post('/billing/payment-proof', upload.single('image'), postPaymentProof);
personalBillingRouter.post(
  '/billing/payment-requests',
  validate({ body: requestPersonalSubscriptionBodySchema }),
  postPaymentRequest,
);
personalBillingRouter.post(
  '/billing/requests/:id/cancel',
  validate({ params: idParamsSchema }),
  postCancelMyRequest,
);
