import { DateRangePreset } from '@furniture-erp/shared';
import { z } from 'zod';

import {
  expenseAnalyticsQuerySchema,
  financialSummaryQuerySchema,
  financialTrendQuerySchema,
} from './analytics.validators.js';

/** Reuse analytics period validation (store timezone resolved in service). */
export const reportsPeriodQuerySchema = financialTrendQuerySchema;

export const reportsSummaryQuerySchema = financialSummaryQuerySchema;

export const reportsExpensesQuerySchema = expenseAnalyticsQuerySchema;

export const reportsProductsQuerySchema = reportsPeriodQuerySchema.and(
  z.object({
    limit: z.coerce.number().int().min(5).max(50).optional(),
  }),
);

export type ReportsPeriodQuery = z.infer<typeof reportsPeriodQuerySchema>;
export type ReportsSummaryQuery = z.infer<typeof reportsSummaryQuerySchema>;
export type ReportsExpensesQuery = z.infer<typeof reportsExpensesQuerySchema>;
export type ReportsProductsQuery = z.infer<typeof reportsProductsQuerySchema>;

/** Ensure LAST_MONTH is accepted once shared enum is rebuilt. */
void DateRangePreset.LAST_MONTH;
