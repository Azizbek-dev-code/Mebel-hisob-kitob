import { ExpenseStatus, MAX_MONEY_AMOUNT } from '@furniture-erp/shared';
import { z } from 'zod';

import {
  calendarDateSchema,
  cuidSchema,
  flexibleDateSchema,
  paginationQuerySchema,
} from './common.validators.js';

/** Expense amounts must be a positive whole number of so'm. */
export const positiveMoneySchema = z
  .number({ invalid_type_error: 'Amount must be a number' })
  .int("Amount must be a whole number of so'm")
  .positive('Amount must be greater than zero')
  .max(MAX_MONEY_AMOUNT, 'Amount is too large');

export const createExpenseBodySchema = z.object({
  categoryId: cuidSchema,
  amount: positiveMoneySchema,
  expenseDate: flexibleDateSchema,
  description: z.string().trim().max(1000).optional(),
});

/**
 * PATCH body — all fields optional, but at least one editable field required.
 * Unknown keys (e.g. storeId, id, createdById) are stripped by Zod.
 */
export const updateExpenseBodySchema = z
  .object({
    categoryId: cuidSchema.optional(),
    amount: positiveMoneySchema.optional(),
    expenseDate: flexibleDateSchema.optional(),
    description: z.string().trim().max(1000).nullable().optional(),
  })
  .refine(
    (body) =>
      body.categoryId !== undefined ||
      body.amount !== undefined ||
      body.expenseDate !== undefined ||
      body.description !== undefined,
    { message: 'At least one field is required' },
  );

export const cancelExpenseBodySchema = z.object({
  reason: z
    .string({ required_error: 'Reason is required' })
    .trim()
    .min(3, 'Provide a reason (at least 3 characters)')
    .max(1000),
});

export const createExpenseCategoryBodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  color: z.string().trim().min(2).max(40).optional(),
});

export const expenseListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  categoryId: cuidSchema.optional(),
  status: z.union([z.nativeEnum(ExpenseStatus), z.literal('ALL')]).optional(),
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
});

export type CreateExpenseBody = z.infer<typeof createExpenseBodySchema>;
export type UpdateExpenseBody = z.infer<typeof updateExpenseBodySchema>;
export type CancelExpenseBody = z.infer<typeof cancelExpenseBodySchema>;
export type CreateExpenseCategoryBody = z.infer<typeof createExpenseCategoryBodySchema>;
export type ExpenseListQuery = z.infer<typeof expenseListQuerySchema>;
