import {
  AssemblyTaskStatus,
  FulfilmentStatus,
  PaymentMethod,
  PaymentType,
  SalePaymentStatus,
  SaleStatus,
  SaleWorkerPayRole,
} from '@furniture-erp/shared';
import { z } from 'zod';

import {
  calendarDateSchema,
  cuidSchema,
  flexibleDateSchema,
  moneySchema,
  optionalMoneySchema,
  paginationQuerySchema,
} from './common.validators.js';

const createCustomerInlineSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(5).max(40),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const saleLineSchema = z.object({
  productId: cuidSchema,
  quantity: z.number().int().positive().max(10_000),
  unitCostPrice: optionalMoneySchema,
  unitSalePrice: optionalMoneySchema,
});

const saleWorkerCompensationItemSchema = z.object({
  role: z.nativeEnum(SaleWorkerPayRole),
  workerId: cuidSchema,
  amount: moneySchema,
});

const workerCompensationArraySchema = z
  .array(saleWorkerCompensationItemSchema)
  .max(4, 'At most four worker pay roles')
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    for (let index = 0; index < items.length; index += 1) {
      const role = items[index]!.role;
      if (seen.has(role)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'role'],
          message: 'Each pay role may appear only once',
        });
      }
      seen.add(role);
    }
  });

export const createSaleBodySchema = z
  .object({
    customerId: cuidSchema.optional(),
    newCustomer: createCustomerInlineSchema.optional(),
    saleDate: flexibleDateSchema.optional(),
    sellerId: cuidSchema.optional(),
    items: z.array(saleLineSchema).min(1, 'Add at least one product'),
    discountAmount: optionalMoneySchema,
    paymentType: z.nativeEnum(PaymentType),
    depositAmount: optionalMoneySchema,
    depositMethod: z.nativeEnum(PaymentMethod).optional(),
    installmentMonthCount: z.number().int().min(1).max(120).optional(),
    installmentFirstDueDate: flexibleDateSchema.optional(),
    sellerBonus: optionalMoneySchema,
    installationCost: optionalMoneySchema,
    deliveryCost: optionalMoneySchema,
    /** Alias → installationCost (Usta haqqi). */
    assemblerFee: optionalMoneySchema,
    /** Alias → deliveryCost (Shopir haqqi). */
    driverFee: optionalMoneySchema,
    otherCosts: optionalMoneySchema,
    assemblerId: cuidSchema.optional(),
    assemblyDeadline: flexibleDateSchema.optional(),
    assemblyNotes: z.string().trim().max(1000).optional(),
    installationRequired: z.boolean().optional(),
    installationDate: flexibleDateSchema.optional(),
    installationNotes: z.string().trim().max(1000).optional(),
    deliveryRequired: z.boolean().optional(),
    deliveryPersonId: cuidSchema.optional(),
    deliveryDate: flexibleDateSchema.optional(),
    deliveryAddress: z.string().trim().max(300).optional(),
    deliveryNotes: z.string().trim().max(1000).optional(),
    notes: z.string().trim().max(2000).optional(),
    workerCompensation: workerCompensationArraySchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.customerId && !value.newCustomer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerId'],
        message: 'Select or create a customer',
      });
    }
    if (value.customerId && value.newCustomer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerId'],
        message: 'Provide either an existing customer or a new one, not both',
      });
    }
    if (value.paymentType === PaymentType.INSTALLMENT) {
      if (!value.installmentMonthCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['installmentMonthCount'],
          message: 'Installment sales need a month count',
        });
      }
    }
  });

export const updateSaleBodySchema = z.object({
  saleDate: flexibleDateSchema.optional(),
  sellerId: cuidSchema.nullable().optional(),
  discountAmount: optionalMoneySchema,
  sellerBonus: optionalMoneySchema,
  installationCost: optionalMoneySchema,
  deliveryCost: optionalMoneySchema,
  /** Alias → installationCost (Usta haqqi). Admin-only on update. */
  assemblerFee: optionalMoneySchema,
  /** Alias → deliveryCost (Shopir haqqi). Admin-only on update. */
  driverFee: optionalMoneySchema,
  otherCosts: optionalMoneySchema,
  assemblerId: cuidSchema.nullable().optional(),
  assemblyDeadline: flexibleDateSchema.nullable().optional(),
  assemblyNotes: z.string().trim().max(1000).nullable().optional(),
  installationRequired: z.boolean().optional(),
  installationStatus: z.nativeEnum(FulfilmentStatus).optional(),
  installationDate: flexibleDateSchema.nullable().optional(),
  installationNotes: z.string().trim().max(1000).nullable().optional(),
  deliveryRequired: z.boolean().optional(),
  deliveryStatus: z.nativeEnum(FulfilmentStatus).optional(),
  deliveryPersonId: cuidSchema.nullable().optional(),
  deliveryDate: flexibleDateSchema.nullable().optional(),
  deliveryAddress: z.string().trim().max(300).nullable().optional(),
  deliveryNotes: z.string().trim().max(1000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  workerCompensation: workerCompensationArraySchema.optional(),
});

export const addPaymentBodySchema = z.object({
  amount: moneySchema.positive('Payment amount must be greater than zero'),
  method: z.nativeEnum(PaymentMethod),
  paidAt: flexibleDateSchema.optional(),
  note: z.string().trim().max(1000).optional(),
  installmentPaymentId: cuidSchema.optional(),
});

export const assignAssemblyBodySchema = z.object({
  assemblerId: cuidSchema,
  deadline: flexibleDateSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateAssemblyTaskBodySchema = z.object({
  status: z.nativeEnum(AssemblyTaskStatus),
  notes: z.string().trim().max(1000).optional(),
});

export const saleListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  paymentStatus: z.nativeEnum(SalePaymentStatus).optional(),
  sellerId: cuidSchema.optional(),
  assemblyStatus: z.nativeEnum(AssemblyTaskStatus).optional(),
  deliveryStatus: z.nativeEnum(FulfilmentStatus).optional(),
  status: z
    .union([z.nativeEnum(SaleStatus), z.enum(['OPEN', 'ALL'])])
    .optional(),
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
});

export const cancelSaleBodySchema = z
  .object({
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();

export const lookupQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export const createCustomerBodySchema = createCustomerInlineSchema;

export type CreateSaleBody = z.infer<typeof createSaleBodySchema>;
export type UpdateSaleBody = z.infer<typeof updateSaleBodySchema>;
export type AddPaymentBody = z.infer<typeof addPaymentBodySchema>;
export type AssignAssemblyBody = z.infer<typeof assignAssemblyBodySchema>;
export type UpdateAssemblyTaskBody = z.infer<typeof updateAssemblyTaskBodySchema>;
export type CancelSaleBody = z.infer<typeof cancelSaleBodySchema>;
export type SaleListQuery = z.infer<typeof saleListQuerySchema>;
export type LookupQuery = z.infer<typeof lookupQuerySchema>;
export type CreateCustomerBody = z.infer<typeof createCustomerBodySchema>;
