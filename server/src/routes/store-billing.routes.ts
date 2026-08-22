import { Router } from 'express';

import {
  getBillingPlans,
  getMySubscription,
  postPaymentRequest,
  postTrialWelcomeSeen,
} from '../controllers/store-billing.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { requestStoreSubscriptionBodySchema } from '../validators/platform-billing.validators.js';

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
