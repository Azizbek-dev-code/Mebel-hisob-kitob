import { PersonalDebtDirection } from '@furniture-erp/shared';
import { z } from 'zod';

import { flexibleDateSchema } from '../../../validators/common.validators.js';
import { positiveMoneySchema } from '../../../validators/expenses.validators.js';

export const createPersonalDebtBodySchema = z.object({
  direction: z.nativeEnum(PersonalDebtDirection),
  personName: z.string().trim().min(2).max(80),
  principalSom: positiveMoneySchema,
  occurredAt: flexibleDateSchema,
  dueAt: flexibleDateSchema.nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

export const updatePersonalDebtBodySchema = z
  .object({
    personName: z.string().trim().min(2).max(80).optional(),
    dueAt: flexibleDateSchema.nullable().optional(),
    note: z.string().trim().max(1000).nullable().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.personName !== undefined ||
      body.dueAt !== undefined ||
      body.note !== undefined ||
      body.isArchived !== undefined,
    { message: 'At least one field is required' },
  );

export const createPersonalDebtPaymentBodySchema = z.object({
  amountSom: positiveMoneySchema,
  occurredAt: flexibleDateSchema,
  note: z.string().trim().max(1000).nullable().optional(),
});
