import { Router } from 'express';

import {
  getAnalytics,
  getDashboard,
  getExpenses,
  getFeatures,
  getInvoices,
  getPlans,
  getPnl,
  getSettings,
  getStoreAccess,
  getSubscriptionRequests,
  patchExpense,
  patchPlan,
  patchSettings,
  postApproveSubscriptionRequest,
  postCancelExpense,
  postExpense,
  postPlan,
  postRecordPayment,
  postRejectPayment,
  postRejectSubscriptionRequest,
} from '../controllers/platform-billing.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requirePlatformAdmin } from '../middleware/require-platform-admin.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validators/common.validators.js';
import {
  createExpenseBodySchema,
  createPlanBodySchema,
  invoiceListQuerySchema,
  pnlQuerySchema,
  recordPaymentBodySchema,
  rejectPaymentBodySchema,
  approveSubscriptionRequestBodySchema,
  subscriptionRequestListQuerySchema,
  updateExpenseBodySchema,
  updatePlanBodySchema,
  updateSettingsBodySchema,
} from '../validators/platform-billing.validators.js';

export const storeAccessRouter = Router();
storeAccessRouter.use(requireAuth);
storeAccessRouter.get('/', getStoreAccess);

export const platformBillingRouter = Router();
platformBillingRouter.use(requireAuth, requirePlatformAdmin);

platformBillingRouter.get('/plans', getPlans);
platformBillingRouter.post('/plans', validate({ body: createPlanBodySchema }), postPlan);
platformBillingRouter.patch(
  '/plans/:id',
  validate({ params: idParamsSchema, body: updatePlanBodySchema }),
  patchPlan,
);
platformBillingRouter.get('/features', getFeatures);

platformBillingRouter.get(
  '/subscription-requests',
  validate({ query: subscriptionRequestListQuerySchema }),
  getSubscriptionRequests,
);
platformBillingRouter.post(
  '/subscription-requests/:id/approve',
  validate({ params: idParamsSchema, body: approveSubscriptionRequestBodySchema }),
  postApproveSubscriptionRequest,
);
platformBillingRouter.post(
  '/subscription-requests/:id/reject',
  validate({ params: idParamsSchema, body: rejectPaymentBodySchema }),
  postRejectSubscriptionRequest,
);

platformBillingRouter.get('/invoices', validate({ query: invoiceListQuerySchema }), getInvoices);
platformBillingRouter.post(
  '/invoices/:id/pay',
  validate({ params: idParamsSchema, body: recordPaymentBodySchema }),
  postRecordPayment,
);
platformBillingRouter.post(
  '/invoices/:id/reject',
  validate({ params: idParamsSchema, body: rejectPaymentBodySchema }),
  postRejectPayment,
);

platformBillingRouter.get('/expenses', getExpenses);
platformBillingRouter.post('/expenses', validate({ body: createExpenseBodySchema }), postExpense);
platformBillingRouter.patch(
  '/expenses/:id',
  validate({ params: idParamsSchema, body: updateExpenseBodySchema }),
  patchExpense,
);
platformBillingRouter.post(
  '/expenses/:id/cancel',
  validate({ params: idParamsSchema }),
  postCancelExpense,
);

platformBillingRouter.get('/settings', getSettings);
platformBillingRouter.patch('/settings', validate({ body: updateSettingsBodySchema }), patchSettings);

platformBillingRouter.get('/pnl', validate({ query: pnlQuerySchema }), getPnl);
platformBillingRouter.get('/analytics', validate({ query: pnlQuerySchema }), getAnalytics);
platformBillingRouter.get('/dashboard', getDashboard);
