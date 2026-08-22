import { StockMovementType } from '@furniture-erp/shared';
import { z } from 'zod';

import { cuidSchema, paginationQuerySchema } from './common.validators.js';

export const inventoryListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  stockFilter: z.enum(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).optional(),
});

export const stockHistoryQuerySchema = paginationQuerySchema.extend({
  productId: cuidSchema.optional(),
  movementType: z.nativeEnum(StockMovementType).optional(),
  search: z.string().trim().max(200).optional(),
});

const positiveQty = z
  .number({ invalid_type_error: 'Quantity must be a number' })
  .int('Quantity must be a whole number')
  .positive('Quantity must be at least 1')
  .max(1_000_000, 'Quantity is too large');

const reasonSchema = z
  .string({ required_error: 'Reason is required' })
  .trim()
  .min(3, 'Provide a reason (at least 3 characters)')
  .max(1000, 'Reason must be at most 1000 characters');

export const stockInBodySchema = z.object({
  productId: cuidSchema,
  quantity: positiveQty,
  reason: reasonSchema,
});

export const stockOutBodySchema = z.object({
  productId: cuidSchema,
  quantity: positiveQty,
  reason: reasonSchema,
});

export const stockAdjustBodySchema = z.object({
  productId: cuidSchema,
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .refine((n) => n !== 0, 'Quantity cannot be zero')
    .refine((n) => Math.abs(n) <= 1_000_000, 'Quantity is too large'),
  reason: reasonSchema,
});

export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;
export type StockHistoryQuery = z.infer<typeof stockHistoryQuerySchema>;
export type StockInBody = z.infer<typeof stockInBodySchema>;
export type StockOutBody = z.infer<typeof stockOutBodySchema>;
export type StockAdjustBody = z.infer<typeof stockAdjustBodySchema>;
