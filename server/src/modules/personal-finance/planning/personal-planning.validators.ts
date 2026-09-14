import { PersonalBudgetKind, PersonalSavingGoalStatus } from '@furniture-erp/shared';
import { z } from 'zod';

import { cuidSchema, flexibleDateSchema, moneySchema } from '../../../validators/common.validators.js';
import { positiveMoneySchema } from '../../../validators/expenses.validators.js';

export const createPersonalBudgetBodySchema = z
  .object({
    kind: z.nativeEnum(PersonalBudgetKind),
    name: z.string().trim().min(2).max(80),
    limitSom: positiveMoneySchema,
    categoryId: cuidSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === PersonalBudgetKind.CATEGORY && !value.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['categoryId'],
        message: 'Kategoriya majburiy',
      });
    }
    if (value.kind === PersonalBudgetKind.TOTAL && value.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['categoryId'],
        message: 'Umumiy budjetda kategoriya bo‘lmasligi kerak',
      });
    }
  });

export const updatePersonalBudgetBodySchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    limitSom: positiveMoneySchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (body) => body.name !== undefined || body.limitSom !== undefined || body.isActive !== undefined,
    { message: 'At least one field is required' },
  );

export const createPersonalSavingGoalBodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  targetSom: positiveMoneySchema,
  targetDate: flexibleDateSchema.nullable().optional(),
  monthlyContributionSom: moneySchema.nullable().optional(),
});

export const updatePersonalSavingGoalBodySchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    targetSom: positiveMoneySchema.optional(),
    targetDate: flexibleDateSchema.nullable().optional(),
    monthlyContributionSom: moneySchema.nullable().optional(),
    status: z.nativeEnum(PersonalSavingGoalStatus).optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.targetSom !== undefined ||
      body.targetDate !== undefined ||
      body.monthlyContributionSom !== undefined ||
      body.status !== undefined,
    { message: 'At least one field is required' },
  );

export const createPersonalGoalContributionBodySchema = z.object({
  amount: positiveMoneySchema,
  occurredAt: flexibleDateSchema,
  note: z.string().trim().max(1000).nullable().optional(),
});
