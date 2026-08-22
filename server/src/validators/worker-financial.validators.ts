import {
  MAX_PAGE_SIZE,
  WORKER_FINANCIAL_CREATABLE_TYPES,
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
} from '@furniture-erp/shared';
import { z } from 'zod';

import {
  calendarDateSchema,
  cuidSchema,
  flexibleDateSchema,
  idParamsSchema,
  paginationQuerySchema,
} from './common.validators.js';
import { positiveMoneySchema } from './expenses.validators.js';

const creatableTypeSchema = z.enum(WORKER_FINANCIAL_CREATABLE_TYPES);
const transactionTypeSchema = z.nativeEnum(WorkerFinancialTransactionType);
const referenceTypeSchema = z.enum([
  WorkerFinancialReferenceType.MANUAL,
  WorkerFinancialReferenceType.SALE,
  WorkerFinancialReferenceType.ASSEMBLY,
  WorkerFinancialReferenceType.PAYROLL,
  WorkerFinancialReferenceType.COMPENSATION,
] as const);

function isRealCalendarDate(value: string): boolean {
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

const periodDateSchema = calendarDateSchema.refine(isRealCalendarDate, 'Enter a date that exists');

function refineFromToPair(
  value: { from?: string; to?: string },
  ctx: z.RefinementCtx,
): void {
  const hasFrom = Boolean(value.from);
  const hasTo = Boolean(value.to);
  if (hasFrom !== hasTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [hasFrom ? 'to' : 'from'],
      message: 'Provide both from and to, or neither',
    });
    return;
  }
  if (value.from && value.to && value.from > value.to) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['from'],
      message: 'The start date must not be after the end date',
    });
  }
}

/**
 * Create body — storeId / createdById / id / timestamps are never accepted.
 * REVERSAL is not creatable here (use the reverse endpoint).
 */
export const createWorkerFinancialTransactionBodySchema = z.object({
  workerId: cuidSchema,
  type: creatableTypeSchema,
  amount: positiveMoneySchema,
  transactionDate: flexibleDateSchema,
  description: z.string().trim().max(1000).optional(),
  referenceType: referenceTypeSchema.optional(),
  referenceId: cuidSchema.optional(),
});

export const reverseWorkerFinancialTransactionBodySchema = z
  .object({
    description: z.string().trim().max(1000).optional(),
    transactionDate: flexibleDateSchema.optional(),
  })
  .default({});

export const workerFinancialTransactionListQuerySchema = paginationQuerySchema
  .extend({
    pageSize: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).optional(),
    type: transactionTypeSchema.optional(),
    from: periodDateSchema.optional(),
    to: periodDateSchema.optional(),
    search: z.string().trim().max(120).optional(),
  })
  .superRefine(refineFromToPair);

export const workerFinancialSummaryQuerySchema = z
  .object({
    from: periodDateSchema.optional(),
    to: periodDateSchema.optional(),
  })
  .superRefine(refineFromToPair);

export const workerIdParamsSchema = z.object({
  workerId: cuidSchema,
});

export const transactionIdParamsSchema = idParamsSchema;

export type CreateWorkerFinancialTransactionBody = z.infer<
  typeof createWorkerFinancialTransactionBodySchema
>;
export type ReverseWorkerFinancialTransactionBody = z.infer<
  typeof reverseWorkerFinancialTransactionBodySchema
>;
export type WorkerFinancialTransactionListQuery = z.infer<
  typeof workerFinancialTransactionListQuerySchema
>;
export type WorkerFinancialSummaryQuery = z.infer<typeof workerFinancialSummaryQuerySchema>;
export type WorkerIdParams = z.infer<typeof workerIdParamsSchema>;
export type TransactionIdParams = z.infer<typeof transactionIdParamsSchema>;
