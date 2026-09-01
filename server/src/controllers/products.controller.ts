import type {
  ProductCategoryListResponse,
  ProductCategoryMutationResponse,
  ProductDetailResponse,
  ProductImageUploadResponse,
  ProductListResponse,
  ProductMutationResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as catalogueService from '../services/product-catalogue.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/http-response.js';
import type {
  CreateProductBody,
  CreateProductCategoryBody,
  ProductListQueryBody,
  UpdateProductBody,
  UpdateProductCategoryBody,
} from '../validators/products.validators.js';

function requireUser(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ProductListQueryBody;
  const data = await catalogueService.listProducts(user.storeId, user.role, query);
  sendSuccess<ProductListResponse>(res, data);
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const product = await catalogueService.getProduct(user.storeId, user.role, req.params.id!);
  sendSuccess<ProductDetailResponse>(res, { product });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as CreateProductBody;
  const product = await catalogueService.createProduct(user.storeId, user.role, body, user.id);
  sendCreated<ProductMutationResponse>(res, { product });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as UpdateProductBody;
  const product = await catalogueService.updateProduct(
    user.storeId,
    user.role,
    req.params.id!,
    body,
    user.id,
  );
  sendSuccess<ProductMutationResponse>(res, { product });
});

export const archiveProduct = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const product = await catalogueService.archiveProduct(
    user.storeId,
    user.role,
    req.params.id!,
    user.id,
  );
  sendSuccess<ProductMutationResponse>(res, { product });
});

export const restoreProduct = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const product = await catalogueService.restoreProduct(
    user.storeId,
    user.role,
    req.params.id!,
    user.id,
  );
  sendSuccess<ProductMutationResponse>(res, { product });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  await catalogueService.deleteProduct(user.storeId, user.role, req.params.id!, user.id);
  sendNoContent(res);
});

export const uploadProductImage = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const file = req.file;
  if (!file) {
    throw ApiError.validation('Image file is required', [
      { field: 'image', message: 'Attach an image file under the field name "image"' },
    ]);
  }
  const product = await catalogueService.uploadProductImage(
    user.storeId,
    user.role,
    req.params.id!,
    {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
    },
    user.id,
  );
  sendSuccess<ProductImageUploadResponse>(res, { product });
});

export const removeProductImage = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const product = await catalogueService.removeProductImage(
    user.storeId,
    user.role,
    req.params.id!,
    user.id,
  );
  sendSuccess<ProductImageUploadResponse>(res, { product });
});

export const listProductCategories = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const includeInactive = req.query.includeInactive === 'true';
  const categories = await catalogueService.listCategories(user.storeId, user.role, {
    includeInactive,
  });
  sendSuccess<ProductCategoryListResponse>(res, { categories });
});

export const createProductCategory = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as CreateProductCategoryBody;
  const category = await catalogueService.createCategory(user.storeId, user.role, body);
  sendCreated<ProductCategoryMutationResponse>(res, { category });
});

export const updateProductCategory = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as UpdateProductCategoryBody;
  const category = await catalogueService.updateCategory(
    user.storeId,
    user.role,
    req.params.id!,
    body,
  );
  sendSuccess<ProductCategoryMutationResponse>(res, { category });
});

export const deactivateProductCategory = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const category = await catalogueService.deactivateCategory(
    user.storeId,
    user.role,
    req.params.id!,
  );
  sendSuccess<ProductCategoryMutationResponse>(res, { category });
});
