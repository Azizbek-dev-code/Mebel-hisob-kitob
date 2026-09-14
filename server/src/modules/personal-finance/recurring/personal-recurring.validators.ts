import {
  PersonalEntryType,
  PersonalRecurringFrequency,
} from '@furniture-erp/shared';
import { z } from 'zod';

import { cuidSchema, flexibleDateSchema } from '../../../validators/common.validators.js';
import { positiveMoneySchema } from '../../../validators/expenses.validators.js';

export const createPersonalRecurringBodySchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    type: z.nativeEnum(PersonalEntryType),
    amountSom: positiveMoneySchema,
    frequency: z.nativeEnum(PersonalRecurringFrequency),
    nextDueAt: flexibleDateSchema,
    intervalDays: z.number().int().min(1).max(365).nullable().optional(),
    dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
    walletId: cuidSchema.nullable().optional(),
    categoryId: cuidSchema.nullable().optional(),
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.frequency === PersonalRecurringFrequency.CUSTOM && !value.intervalDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['intervalDays'],
        message: 'Interval kunlari majburiy',
      });
    }
  });

export const updatePersonalRecurringBodySchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    amountSom: positiveMoneySchema.optional(),
    frequency: z.nativeEnum(PersonalRecurringFrequency).optional(),
    nextDueAt: flexibleDateSchema.optional(),
    intervalDays: z.number().int().min(1).max(365).nullable().optional(),
    dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
    walletId: cuidSchema.nullable().optional(),
    categoryId: cuidSchema.nullable().optional(),
    note: z.string().trim().max(1000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.amountSom !== undefined ||
      body.frequency !== undefined ||
      body.nextDueAt !== undefined ||
      body.intervalDays !== undefined ||
      body.dayOfMonth !== undefined ||
      body.walletId !== undefined ||
      body.categoryId !== undefined ||
      body.note !== undefined ||
      body.isActive !== undefined,
    { message: 'At least one field is required' },
  );
