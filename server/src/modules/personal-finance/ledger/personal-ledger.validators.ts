import {
  ExpenseStatus,
  PersonalCategoryKind,
  PersonalEntryType,
  PersonalHistoryKind,
  PersonalWalletKind,
} from '@furniture-erp/shared';
import { z } from 'zod';

import {
  calendarDateSchema,
  cuidSchema,
  flexibleDateSchema,
  moneySchema,
  paginationQuerySchema,
} from '../../../validators/common.validators.js';
import { positiveMoneySchema } from '../../../validators/expenses.validators.js';

export const createPersonalWalletBodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  kind: z.nativeEnum(PersonalWalletKind),
  openingBalanceSom: moneySchema.optional(),
});

export const updatePersonalWalletBodySchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    kind: z.nativeEnum(PersonalWalletKind).optional(),
    openingBalanceSom: moneySchema.optional(),
    isArchived: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.kind !== undefined ||
      body.openingBalanceSom !== undefined ||
      body.isArchived !== undefined,
    { message: 'At least one field is required' },
  );

export const createPersonalCategoryBodySchema = z.object({
  kind: z.nativeEnum(PersonalCategoryKind),
  name: z.string().trim().min(2).max(80),
  color: z.string().trim().min(2).max(40).optional(),
});

export const updatePersonalCategoryBodySchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    color: z.string().trim().min(2).max(40).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (body) => body.name !== undefined || body.color !== undefined || body.isActive !== undefined,
    { message: 'At least one field is required' },
  );

export const createPersonalEntryBodySchema = z.object({
  type: z.nativeEnum(PersonalEntryType),
  walletId: cuidSchema,
  categoryId: cuidSchema,
  amount: positiveMoneySchema,
  occurredAt: flexibleDateSchema,
  note: z.string().trim().max(1000).nullable().optional(),
});

export const updatePersonalEntryBodySchema = z
  .object({
    walletId: cuidSchema.optional(),
    categoryId: cuidSchema.optional(),
    amount: positiveMoneySchema.optional(),
    occurredAt: flexibleDateSchema.optional(),
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .refine(
    (body) =>
      body.walletId !== undefined ||
      body.categoryId !== undefined ||
      body.amount !== undefined ||
      body.occurredAt !== undefined ||
      body.note !== undefined,
    { message: 'At least one field is required' },
  );

export const personalEntryListQuerySchema = paginationQuerySchema.extend({
  type: z.nativeEnum(PersonalEntryType).optional(),
  status: z.union([z.nativeEnum(ExpenseStatus), z.literal('ALL')]).optional(),
  walletId: cuidSchema.optional(),
  categoryId: cuidSchema.optional(),
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
});

export const personalCategoryListQuerySchema = z.object({
  kind: z.nativeEnum(PersonalCategoryKind).optional(),
});

export const personalTransferListQuerySchema = paginationQuerySchema.extend({
  status: z.union([z.nativeEnum(ExpenseStatus), z.literal('ALL')]).optional(),
  walletId: cuidSchema.optional(),
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
});

export const personalHistoryListQuerySchema = paginationQuerySchema.extend({
  kind: z.nativeEnum(PersonalHistoryKind).optional(),
  walletId: cuidSchema.optional(),
  categoryId: cuidSchema.optional(),
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
  q: z.string().trim().max(80).optional(),
});

export const createPersonalTransferBodySchema = z
  .object({
    fromWalletId: cuidSchema,
    toWalletId: cuidSchema,
    amount: positiveMoneySchema,
    occurredAt: flexibleDateSchema,
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((body) => body.fromWalletId !== body.toWalletId, {
    message: 'O‘tkazma bir xil hisobga bo‘lmaydi',
    path: ['toWalletId'],
  });
