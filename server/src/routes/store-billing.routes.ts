import { Router } from 'express';
import multer from 'multer';

import {
  getBillingPlans,
  getMyPayments,
  getMySubscription,
  getMySubscriptionRequests,
  getPaymentInstructions,
  postCancelMyRequest,
  postPaymentProof,
  postPaymentRequest,
  postTrialWelcomeSeen,
} from '../controllers/store-billing.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { PRODUCT_IMAGE_MAX_BYTES } from '../lib/storage/types.js';
import { idParamsSchema } from '../validators/common.validators.js';
import { requestStoreSubscriptionBodySchema } from '../validators/platform-billing.validators.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PRODUCT_IMAGE_MAX_BYTES, files: 1 },
});

/**
 * A store reading and changing its own subscription.
 *
 * Every handler derives the store from the session, so there is no id in any
 * path that could point at another shop's plan, requests or payments.
 */
export const storeBillingRouter = Router();
storeBillingRouter.use(requireAuth);

storeBillingRouter.get('/plans', getBillingPlans);
storeBillingRouter.get('/subscription', getMySubscription);
storeBillingRouter.get('/payment-instructions', getPaymentInstructions);
storeBillingRouter.post('/trial-welcome-seen', postTrialWelcomeSeen);
storeBillingRouter.post('/payment-proof', upload.single('image'), postPaymentProof);
storeBillingRouter.post(
  '/payment-requests',
  validate({ body: requestStoreSubscriptionBodySchema }),
  postPaymentRequest,
);
storeBillingRouter.get('/requests', getMySubscriptionRequests);
storeBillingRouter.post(
  '/requests/:id/cancel',
  validate({ params: idParamsSchema }),
  postCancelMyRequest,
);
storeBillingRouter.get('/payments', getMyPayments);
