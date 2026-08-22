import type {
  CreateCustomerResponse,
  CustomerLookupResponse,
  ProductLookupResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as lookupService from '../services/lookup.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../utils/http-response.js';
import type { CreateCustomerBody, LookupQuery } from '../validators/sales.validators.js';

function requireUser(req: Request) {
  if (!req.auth) {
    throw ApiError.unauthorized();
  }
  return req.auth;
}

export const searchCustomers = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as LookupQuery;
  const items = await lookupService.searchCustomers(user.storeId, query.q, query.limit);
  sendSuccess<CustomerLookupResponse>(res, { items });
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as CreateCustomerBody;
  const customer = await lookupService.createCustomer(user.storeId, body);
  sendCreated<CreateCustomerResponse>(res, { customer });
});

export const searchProducts = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as LookupQuery;
  const items = await lookupService.searchProducts(user.storeId, query.q, query.limit);
  sendSuccess<ProductLookupResponse>(res, { items });
});
