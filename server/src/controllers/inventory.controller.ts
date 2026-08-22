import type {
  InventoryListResponse,
  InventoryProductDetailResponse,
  StockHistoryResponse,
  StockMutationResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as inventoryService from '../services/inventory.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../utils/http-response.js';
import type { IdParams } from '../validators/common.validators.js';
import type {
  InventoryListQuery,
  StockAdjustBody,
  StockHistoryQuery,
  StockInBody,
  StockOutBody,
} from '../validators/inventory.validators.js';

function requireUser(req: Request) {
  if (!req.auth) {
    throw ApiError.unauthorized();
  }
  return req.auth;
}

export const listInventory = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as InventoryListQuery;
  const result = await inventoryService.listInventory(user.storeId, user.role, query);
  sendSuccess<InventoryListResponse>(res, result);
});

export const getInventoryProduct = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const result = await inventoryService.getInventoryProduct(user.storeId, user.role, id);
  sendSuccess<InventoryProductDetailResponse>(res, result);
});

export const listStockHistory = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as StockHistoryQuery;
  const result = await inventoryService.listStockHistory(user.storeId, user.role, query);
  sendSuccess<StockHistoryResponse>(res, result);
});

export const stockIn = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as StockInBody;
  const result = await inventoryService.stockIn(user.storeId, user, body);
  sendCreated<StockMutationResponse>(res, result);
});

export const stockOut = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as StockOutBody;
  const result = await inventoryService.stockOut(user.storeId, user, body);
  sendCreated<StockMutationResponse>(res, result);
});

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as StockAdjustBody;
  const result = await inventoryService.adjustStock(user.storeId, user, body);
  sendCreated<StockMutationResponse>(res, result);
});
