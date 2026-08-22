import {
  PaymentMethod,
  SupplierStatus,
  type CancelPurchaseRequest,
  type CreatePurchaseRequest,
  type CreateSupplierPaymentRequest,
  type CreateSupplierRequest,
  type PurchaseDetail,
  type PurchaseListItem,
  type PurchaseListQuery,
  type PurchaseListResponse,
  type SupplierDetail,
  type SupplierListItem,
  type SupplierListQuery,
  type SupplierListResponse,
  type UpdateSupplierRequest,
} from '@furniture-erp/shared';
import { z } from 'zod';

import {
  cuidSchema,
  flexibleDateSchema,
  moneySchema,
  optionalMoneySchema,
  paginationQuerySchema,
} from './common.validators.js';

export const createSupplierBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  phone: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
}) satisfies z.ZodType<CreateSupplierRequest>;

export const updateSupplierBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined || body.phone !== undefined || body.notes !== undefined,
    { message: 'At least one field is required' },
  ) satisfies z.ZodType<UpdateSupplierRequest>;

export const supplierListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  status: z.union([z.nativeEnum(SupplierStatus), z.literal('ALL')]).optional(),
  debtFilter: z.enum(['ALL', 'CLEAR', 'IN_DEBT']).optional(),
}) satisfies z.ZodType<SupplierListQuery>;

const purchaseItemSchema = z.object({
  productId: cuidSchema,
  quantity: z.number().int().positive().max(1_000_000),
  unitCost: moneySchema,
});

export const createPurchaseBodySchema = z
  .object({
    supplierId: cuidSchema,
    items: z.array(purchaseItemSchema).min(1, 'Add at least one product'),
    paidAmount: optionalMoneySchema,
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    purchaseDate: flexibleDateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const paid = value.paidAmount ?? 0;
    if (paid > 0 && !value.paymentMethod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentMethod'],
        message: 'Payment method is required when paidAmount is greater than zero',
      });
    }
  }) satisfies z.ZodType<CreatePurchaseRequest>;

export const purchaseListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  paymentFilter: z
    .enum(['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'])
    .optional(),
  supplierId: cuidSchema.optional(),
}) satisfies z.ZodType<PurchaseListQuery>;

export const createSupplierPaymentBodySchema = z.object({
  amount: moneySchema.refine((v) => v > 0, { message: 'Amount must be greater than zero' }),
  method: z.nativeEnum(PaymentMethod),
  note: z.string().trim().max(1000).nullable().optional(),
  paidAt: flexibleDateSchema.optional(),
}) satisfies z.ZodType<CreateSupplierPaymentRequest>;

export const cancelPurchaseBodySchema = z.object({
  reason: z.string().trim().min(3, 'Provide a reason (at least 3 characters)').max(1000),
}) satisfies z.ZodType<CancelPurchaseRequest>;

export type CreateSupplierBody = z.infer<typeof createSupplierBodySchema>;
export type UpdateSupplierBody = z.infer<typeof updateSupplierBodySchema>;
export type SupplierListQueryBody = z.infer<typeof supplierListQuerySchema>;
export type CreatePurchaseBody = z.infer<typeof createPurchaseBodySchema>;
export type PurchaseListQueryBody = z.infer<typeof purchaseListQuerySchema>;
export type CreateSupplierPaymentBody = z.infer<typeof createSupplierPaymentBodySchema>;
export type CancelPurchaseBody = z.infer<typeof cancelPurchaseBodySchema>;

void (null as unknown as SupplierListItem);
void (null as unknown as SupplierDetail);
void (null as unknown as SupplierListResponse);
void (null as unknown as PurchaseListItem);
void (null as unknown as PurchaseDetail);
void (null as unknown as PurchaseListResponse);
