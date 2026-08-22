import { DASHBOARD_MAX_RANGE_DAYS, DateRangePreset } from '@furniture-erp/shared';
import { z } from 'zod';

const DAY_MS = 24 * 60 * 60 * 1000;

function calendarParts(value: string): { year: number; month: number; day: number } {
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number);
  return { year, month, day };
}

/** Rejects the dates a regex still lets through, such as `2026-02-31`. */
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

/**
 * The period the dashboard is asked for.
 *
 * Custom ranges are named by inclusive calendar dates rather than instants: the
 * server resolves them against the store's own timezone, so "1 August" means the
 * store's first of August whatever timezone the browser is in.
 *
 * A `YYYY-MM-DD` string sorts chronologically, which is what lets the ordering
 * and span checks run here rather than after the range has been resolved.
 */
export const dashboardSummaryQuerySchema = z
  .object({
    preset: z.nativeEnum(DateRangePreset).default(DateRangePreset.THIS_MONTH),
    from: calendarDate.optional(),
    to: calendarDate.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.preset !== DateRangePreset.CUSTOM) return;

    if (!value.from || !value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [value.from ? 'to' : 'from'],
        message: 'A custom period needs both a start and an end date',
      });
      return;
    }

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
        message: `A custom period cannot be longer than ${DASHBOARD_MAX_RANGE_DAYS} days`,
      });
    }
  });

export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
