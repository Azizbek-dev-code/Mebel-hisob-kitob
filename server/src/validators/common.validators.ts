import { MAX_MONEY_AMOUNT } from '@furniture-erp/shared';
import { z } from 'zod';

/** Whole so'm amount accepted from the API. */
export const moneySchema = z
  .number({ invalid_type_error: 'Amount must be a number' })
  .int('Amount must be a whole number of so\'m')
  .nonnegative('Amount cannot be negative')
  .max(MAX_MONEY_AMOUNT, 'Amount is too large');

export const optionalMoneySchema = moneySchema.optional();

export const cuidSchema = z.string().cuid('Invalid id');

/** Workspace / identity ids may be cuid (default) or UUID (identity-layer backfill). */
export const entityIdSchema = z
  .string()
  .min(1, 'Invalid id')
  .refine((value) => z.string().cuid().safeParse(value).success || z.string().uuid().safeParse(value).success, {
    message: 'Invalid id',
  });

export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date format YYYY-MM-DD');

export const isoDateTimeSchema = z
  .string()
  .datetime({ offset: true, message: 'Use an ISO-8601 datetime' });

/** Accepts either a calendar date or a full ISO datetime. */
export const flexibleDateSchema = z.union([calendarDateSchema, isoDateTimeSchema]);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const idParamsSchema = z.object({
  id: cuidSchema,
});

export type IdParams = z.infer<typeof idParamsSchema>;
