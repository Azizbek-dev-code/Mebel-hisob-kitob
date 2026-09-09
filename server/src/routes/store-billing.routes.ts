import { Router } from 'express';

import {
  getBillingPlans,
  getMyPayments,
  getMySubscription,
  getMySubscriptionRequests,
  postCancelMyRequest,
  postPaymentRequest,
  postTrialWelcomeSeen,
} from '../controllers/store-billing.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validators/common.validators.js';
import { requestStoreSubscriptionBodySchema } from '../validators/platform-billing.validators.js';

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
storeBillingRouter.post('/trial-welcome-seen', postTrialWelcomeSeen);
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
