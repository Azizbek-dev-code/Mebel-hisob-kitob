import type {
  AddPaymentResponse,
  AssemblyTaskListResponse,
  AssemblyTaskResponse,
  CancelSaleResponse,
  CreateSaleResponse,
  SaleDetailResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as saleService from '../services/sale.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendPaginated, sendSuccess } from '../utils/http-response.js';
import type { IdParams } from '../validators/common.validators.js';
import type {
  AddPaymentBody,
  AssignAssemblyBody,
  CancelSaleBody,
  CreateSaleBody,
  SaleListQuery,
  UpdateAssemblyTaskBody,
  UpdateSaleBody,
} from '../validators/sales.validators.js';

function requireUser(req: Request) {
  if (!req.auth) {
    throw ApiError.unauthorized();
  }
  return req.auth;
}

export const listSales = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as SaleListQuery;

  const result = await saleService.listSales({
    storeId: user.storeId,
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    paymentStatus: query.paymentStatus,
    sellerId: query.sellerId,
    assemblyStatus: query.assemblyStatus,
    deliveryStatus: query.deliveryStatus,
    status: query.status,
    from: query.from,
    to: query.to,
  });

  sendPaginated(res, result.items, result.meta);
});

export const getSale = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;

  const sale = await saleService.getSale(user.storeId, id);
  sendSuccess<SaleDetailResponse>(res, { sale });
});

export const createSale = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as CreateSaleBody;

  const sale = await saleService.createSale(user.storeId, user.id, body);
  sendCreated<CreateSaleResponse>(res, { sale });
});

export const updateSale = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const body = req.body as UpdateSaleBody;

  const sale = await saleService.updateSale(user.storeId, user, id, body);
  sendSuccess<SaleDetailResponse>(res, { sale });
});

export const cancelSale = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const body = req.body as CancelSaleBody;

  const sale = await saleService.cancelSale(user.storeId, user, id, body);
  sendSuccess<CancelSaleResponse>(res, { sale });
});

export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;

  const payments = await saleService.listSalePayments(user.storeId, id);
  sendSuccess(res, { payments });
});

export const addPayment = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const body = req.body as AddPaymentBody;

  const result = await saleService.addPayment(user.storeId, user.id, id, body);
  sendCreated<AddPaymentResponse>(res, result);
});

export const assignAssembly = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const body = req.body as AssignAssemblyBody;

  const sale = await saleService.assignAssembly(user.storeId, user.id, id, body);
  sendSuccess<SaleDetailResponse>(res, { sale });
});

export const listMyAssemblyTasks = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const items = await saleService.listMyAssemblyTasks(user.storeId, user.id);
  sendSuccess<AssemblyTaskListResponse>(res, { items });
});

export const updateAssemblyTask = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const body = req.body as UpdateAssemblyTaskBody;

  const result = await saleService.updateAssemblyTask(user.storeId, user.id, id, body);
  sendSuccess<AssemblyTaskResponse>(res, result);
});
