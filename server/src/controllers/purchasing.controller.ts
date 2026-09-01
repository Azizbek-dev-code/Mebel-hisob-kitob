import type {
  PurchaseDetailResponse,
  PurchaseListResponse,
  PurchaseMutationResponse,
  SupplierDetailResponse,
  SupplierListResponse,
  SupplierMutationResponse,
  SupplierPaymentMutationResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as purchasingService from '../services/purchasing.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../utils/http-response.js';
import type {
  CancelPurchaseBody,
  CreatePurchaseBody,
  CreateSupplierBody,
  CreateSupplierPaymentBody,
  PurchaseListQueryBody,
  SupplierListQueryBody,
  UpdatePurchaseDeliveryBody,
  UpdateSupplierBody,
} from '../validators/purchasing.validators.js';

function requireUser(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

export const listSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as SupplierListQueryBody;
  const data = await purchasingService.listSuppliers(user.storeId, user.role, query);
  sendSuccess<SupplierListResponse>(res, data);
});

export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const supplier = await purchasingService.getSupplier(user.storeId, user.role, req.params.id!);
  sendSuccess<SupplierDetailResponse>(res, { supplier });
});

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as CreateSupplierBody;
  const supplier = await purchasingService.createSupplier(user.storeId, user.role, body, user.id);
  sendCreated<SupplierMutationResponse>(res, { supplier });
});

export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as UpdateSupplierBody;
  const supplier = await purchasingService.updateSupplier(
    user.storeId,
    user.role,
    req.params.id!,
    body,
    user.id,
  );
  sendSuccess<SupplierMutationResponse>(res, { supplier });
});

export const archiveSupplier = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const supplier = await purchasingService.archiveSupplier(
    user.storeId,
    user.role,
    req.params.id!,
    user.id,
  );
  sendSuccess<SupplierMutationResponse>(res, { supplier });
});

export const restoreSupplier = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const supplier = await purchasingService.restoreSupplier(
    user.storeId,
    user.role,
    req.params.id!,
    user.id,
  );
  sendSuccess<SupplierMutationResponse>(res, { supplier });
});

export const listPurchases = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as PurchaseListQueryBody;
  const data = await purchasingService.listPurchases(user.storeId, user.role, query);
  sendSuccess<PurchaseListResponse>(res, data);
});

export const getPurchase = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const purchase = await purchasingService.getPurchase(user.storeId, user.role, req.params.id!);
  sendSuccess<PurchaseDetailResponse>(res, { purchase });
});

export const createPurchase = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as CreatePurchaseBody;
  const purchase = await purchasingService.createPurchase(
    user.storeId,
    { id: user.id, role: user.role },
    body,
  );
  sendCreated<PurchaseMutationResponse>(res, { purchase });
});

export const updatePurchaseDelivery = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as UpdatePurchaseDeliveryBody;
  const purchase = await purchasingService.updatePurchaseDelivery(
    user.storeId,
    { id: user.id, role: user.role },
    req.params.id!,
    body,
  );
  sendSuccess<PurchaseMutationResponse>(res, { purchase });
});

export const addPurchasePayment = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as CreateSupplierPaymentBody;
  const result = await purchasingService.addPayment(
    user.storeId,
    { id: user.id, role: user.role },
    req.params.id!,
    body,
  );
  sendSuccess<SupplierPaymentMutationResponse>(res, result);
});

export const cancelPurchase = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as CancelPurchaseBody;
  const purchase = await purchasingService.cancelPurchase(
    user.storeId,
    { id: user.id, role: user.role },
    req.params.id!,
    body,
  );
  sendSuccess<PurchaseMutationResponse>(res, { purchase });
});
