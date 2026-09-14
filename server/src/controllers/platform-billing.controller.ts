import type { Request, Response } from 'express';

import { resolvePlatformDateRange } from '../lib/platform-date-range.js';
import * as billing from '../services/platform-billing.service.js';
import * as entitlement from '../services/entitlement.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../utils/http-response.js';
import type { IdParams } from '../validators/common.validators.js';
import type {
  assignPlanBodySchema,
  createExpenseBodySchema,
  createPlanBodySchema,
  invoiceListQuerySchema,
  manualBlockBodySchema,
  pnlQuerySchema,
  recordPaymentBodySchema,
  updateExpenseBodySchema,
  updatePlanBodySchema,
  updateSettingsBodySchema,
} from '../validators/platform-billing.validators.js';

function requireUser(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

function rangeFromQuery(query: { from?: string; to?: string; preset?: string }) {
  return resolvePlatformDateRange(query);
}

export const getPlans = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(res, await billing.listPlans(user.role));
});

export const postPlan = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const plan = await billing.createPlan(user, req.body as typeof createPlanBodySchema._type);
  sendCreated(res, { plan });
});

export const patchPlan = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const plan = await billing.updatePlan(user, id, req.body as typeof updatePlanBodySchema._type);
  sendSuccess(res, { plan });
});

export const getShops = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(res, await billing.listShops(user.role));
});

export const getShop = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  sendSuccess(res, await billing.getShopDetail(user.role, id));
});

export const postAssignPlan = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const subscription = await billing.assignPlan(
    user,
    id,
    req.body as typeof assignPlanBodySchema._type,
  );
  sendSuccess(res, { subscription });
});

export const postManualBlock = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const body = req.body as typeof manualBlockBodySchema._type;
  const shop = await billing.setManualBlock(user, id, body.blocked);
  sendSuccess(res, { shop });
});

export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(
    res,
    await billing.listInvoices(user.role, req.query as unknown as typeof invoiceListQuerySchema._type),
  );
});

export const postRecordPayment = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const invoice = await billing.recordPayment(
    user,
    id,
    req.body as typeof recordPaymentBodySchema._type,
  );
  sendSuccess(res, { invoice });
});

export const postRejectPayment = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const invoice = await billing.rejectPayment(user, id, req.body as { reason: string });
  sendSuccess(res, { invoice });
});

export const postActivateSubscription = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const subscription = await billing.activateSubscriptionManually(
    user,
    id,
    req.body as { planId: string; startDate: string; endDate: string },
  );
  sendSuccess(res, { subscription });
});

export const getExpenses = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(res, await billing.listExpenses(user.role));
});

export const postExpense = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const expense = await billing.createExpense(user, req.body as typeof createExpenseBodySchema._type);
  sendCreated(res, { expense });
});

export const patchExpense = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const expense = await billing.updateExpense(
    user,
    id,
    req.body as typeof updateExpenseBodySchema._type,
  );
  sendSuccess(res, { expense });
});

export const postCancelExpense = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const expense = await billing.cancelExpense(user, id);
  sendSuccess(res, { expense });
});

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(res, { settings: await billing.getSettings(user.role) });
});

export const patchSettings = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const settings = await billing.updateSettings(
    user,
    req.body as typeof updateSettingsBodySchema._type,
  );
  sendSuccess(res, { settings });
});

export const getPnl = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { from, to, label } = rangeFromQuery(req.query as typeof pnlQuerySchema._type);
  sendSuccess(res, await billing.getPnl(user.role, from, to, label));
});

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { from, to } = rangeFromQuery(req.query as typeof pnlQuerySchema._type);
  sendSuccess(res, await billing.getAnalytics(user.role, from, to));
});

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { from, to, label } = rangeFromQuery(req.query as typeof pnlQuerySchema._type);
  sendSuccess(res, await billing.getDashboard(user.role, from, to, label));
});

export const getStoreAccess = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(res, { access: await billing.getStoreAccessStatus(user.storeId) });
});

export const getFeatures = asyncHandler(async (req: Request, res: Response) => {
  requireUser(req);
  sendSuccess(res, await entitlement.listFeatureCatalog());
});

export const getSubscriptionRequests = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const status = (req.query as { status?: string }).status;
  sendSuccess(
    res,
    await billing.listSubscriptionRequests(
      user.role,
      status as Parameters<typeof billing.listSubscriptionRequests>[1],
    ),
  );
});

export const postApproveSubscriptionRequest = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const result = await billing.approveSubscriptionRequest(
    user,
    id,
    req.body as { startDate: string; endDate: string; paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER'; note?: string },
  );
  sendSuccess(res, result);
});

export const postRejectSubscriptionRequest = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const request = await billing.rejectSubscriptionRequest(user, id, req.body as { reason: string });
  sendSuccess(res, { request });
});
