import { DASHBOARD_MAX_RANGE_DAYS, DateRangePreset } from '@furniture-erp/shared';
import { z } from 'zod';

import { cuidSchema } from './common.validators.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function calendarParts(value: string): { year: number; month: number; day: number } {
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number);
  return { year, month, day };
}

function isRealCalendarDate(value: string): boolean {
  const { year, month, day } = calendarParts(value);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function inclusiveDaySpan(from: string, to: string): number {
  const asUtc = (value: string): number => {
    const { year, month, day } = calendarParts(value);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((asUtc(to) - asUtc(from)) / DAY_MS) + 1;
}

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date format YYYY-MM-DD')
  .refine(isRealCalendarDate, 'Enter a date that exists');

const analyticsPeriodBaseSchema = z.object({
  preset: z.nativeEnum(DateRangePreset).optional(),
  from: calendarDate.optional(),
  to: calendarDate.optional(),
  /** Ignored if present — store scope always comes from the session. */
  storeId: z.string().optional(),
});

function refinePeriod(
  value: { preset?: DateRangePreset; from?: string; to?: string },
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

  if (value.preset === DateRangePreset.CUSTOM && (!value.from || !value.to)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [value.from ? 'to' : 'from'],
      message: 'A custom period needs both a start and an end date',
    });
    return;
  }

  if (value.from && value.to) {
    if (value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['from'],
        message: 'The start date must not be after the end date',
      });
      return;
    }
    if (inclusiveDaySpan(value.from, value.to) > DASHBOARD_MAX_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: `A period cannot be longer than ${DASHBOARD_MAX_RANGE_DAYS} days`,
      });
    }
  }
}

export const financialSummaryQuerySchema = analyticsPeriodBaseSchema
  .extend({
    comparison: z.enum(['previous']).optional(),
  })
  .superRefine(refinePeriod);

export const expenseAnalyticsQuerySchema = analyticsPeriodBaseSchema
  .extend({
    categoryId: cuidSchema.optional(),
  })
  .superRefine(refinePeriod);

/** Same period shape as the summary — no comparison flag. */
export const financialTrendQuerySchema = analyticsPeriodBaseSchema.superRefine(refinePeriod);

export type FinancialSummaryQuery = z.infer<typeof financialSummaryQuerySchema>;
export type ExpenseAnalyticsQuery = z.infer<typeof expenseAnalyticsQuerySchema>;
export type FinancialTrendQuery = z.infer<typeof financialTrendQuerySchema>;
