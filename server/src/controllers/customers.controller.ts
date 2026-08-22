import type {
  CustomerDetailResponse,
  CustomerListResponse,
  CustomerMutationResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as catalogueService from '../services/customer-catalogue.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../utils/http-response.js';
import type {
  CreateCustomerCatalogueBody,
  CustomerListQueryBody,
  UpdateCustomerBody,
} from '../validators/customers.validators.js';

function requireUser(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as CustomerListQueryBody;
  const data = await catalogueService.listCustomers(user.storeId, user.role, query);
  sendSuccess<CustomerListResponse>(res, data);
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const customer = await catalogueService.getCustomer(
    user.storeId,
    user.role,
    req.params.id!,
  );
  sendSuccess<CustomerDetailResponse>(res, { customer });
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as CreateCustomerCatalogueBody;
  const customer = await catalogueService.createCustomer(user.storeId, user.role, body, user.id);
  sendCreated<CustomerMutationResponse>(res, { customer });
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as UpdateCustomerBody;
  const customer = await catalogueService.updateCustomer(
    user.storeId,
    user.role,
    req.params.id!,
    body,
    user.id,
  );
  sendSuccess<CustomerMutationResponse>(res, { customer });
});

export const archiveCustomer = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const customer = await catalogueService.archiveCustomer(
    user.storeId,
    user.role,
    req.params.id!,
    user.id,
  );
  sendSuccess<CustomerMutationResponse>(res, { customer });
});

export const restoreCustomer = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const customer = await catalogueService.restoreCustomer(
    user.storeId,
    user.role,
    req.params.id!,
    user.id,
  );
  sendSuccess<CustomerMutationResponse>(res, { customer });
});
