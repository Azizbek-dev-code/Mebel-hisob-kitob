import {
  ProductStatus,
  type CreateProductCategoryRequest,
  type CreateProductRequest,
  type ProductCatalogueStockFilter,
  type ProductCatalogueStatusFilter,
  type ProductCategoryItem,
  type ProductDetail,
  type ProductListItem,
  type ProductListQuery,
  type ProductListResponse,
  type UpdateProductCategoryRequest,
  type UpdateProductRequest,
} from '@furniture-erp/shared';
import { z } from 'zod';

import {
  cuidSchema,
  moneySchema,
  paginationQuerySchema,
} from './common.validators.js';

export const createProductBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  /** Omit or 0 when the purchase cost is not known yet. */
  costPrice: moneySchema.optional(),
  defaultSalePrice: moneySchema,
  sku: z.string().trim().min(1).max(80).nullable().optional(),
  categoryId: cuidSchema.nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  minStockQty: z.number().int().min(0).max(1_000_000).optional(),
  trackStock: z.boolean().optional(),
}) satisfies z.ZodType<CreateProductRequest>;

export const updateProductBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    costPrice: moneySchema.optional(),
    defaultSalePrice: moneySchema.optional(),
    sku: z.string().trim().min(1).max(80).nullable().optional(),
    categoryId: cuidSchema.nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    minStockQty: z.number().int().min(0).max(1_000_000).optional(),
    trackStock: z.boolean().optional(),
    status: z.nativeEnum(ProductStatus).optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.costPrice !== undefined ||
      body.defaultSalePrice !== undefined ||
      body.sku !== undefined ||
      body.categoryId !== undefined ||
      body.description !== undefined ||
      body.minStockQty !== undefined ||
      body.trackStock !== undefined ||
      body.status !== undefined,
    { message: 'At least one field is required' },
  ) satisfies z.ZodType<UpdateProductRequest>;

export const productListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  status: z
    .union([z.nativeEnum(ProductStatus), z.literal('ALL')])
    .optional() as z.ZodType<ProductCatalogueStatusFilter | undefined>,
  stockFilter: z
    .enum(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNTRACKED'])
    .optional() as z.ZodType<ProductCatalogueStockFilter | undefined>,
  categoryId: cuidSchema.optional(),
}) satisfies z.ZodType<ProductListQuery>;

export const createProductCategoryBodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
}) satisfies z.ZodType<CreateProductCategoryRequest>;

export const updateProductCategoryBodySchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined || body.description !== undefined || body.sortOrder !== undefined,
    { message: 'At least one field is required' },
  ) satisfies z.ZodType<UpdateProductCategoryRequest>;

export type CreateProductBody = z.infer<typeof createProductBodySchema>;
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;
export type ProductListQueryBody = z.infer<typeof productListQuerySchema>;
export type CreateProductCategoryBody = z.infer<typeof createProductCategoryBodySchema>;
export type UpdateProductCategoryBody = z.infer<typeof updateProductCategoryBodySchema>;

/** Compile-time anchors so DTO shapes stay aligned with validators. */
void (null as unknown as ProductListItem);
void (null as unknown as ProductDetail);
void (null as unknown as ProductCategoryItem);
void (null as unknown as ProductListResponse);
