import {
  GrowthHabitBadMode,
  GrowthHabitFrequency,
  GrowthHabitGoalPeriod,
  GrowthHabitKind,
  GrowthHabitProgressPeriod,
  GrowthHabitScheduleKind,
  GrowthHabitTimeOfDay,
} from '@furniture-erp/shared';
import { z } from 'zod';

import { cuidSchema } from '../../../validators/common.validators.js';

const optionalText = z.string().trim().max(2000).nullable().optional();
const optionalCategory = z.string().trim().max(60).nullable().optional();
const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const weekdaysSchema = z.array(z.number().int().min(1).max(7)).max(7).optional();
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const checklistSchema = z
  .array(
    z.object({
      title: z.string().trim().min(1).max(200),
      sortOrder: z.number().int().min(0).max(100).optional(),
    }),
  )
  .max(20)
  .optional();

const habitFields = {
  title: z.string().trim().min(1).max(200),
  description: optionalText,
  category: optionalCategory,
  kind: z.nativeEnum(GrowthHabitKind).optional(),
  badMode: z.nativeEnum(GrowthHabitBadMode).nullable().optional(),
  icon: z.string().trim().max(40).nullable().optional(),
  color: z.string().trim().max(20).nullable().optional(),
  frequency: z.nativeEnum(GrowthHabitFrequency).optional(),
  scheduleKind: z.nativeEnum(GrowthHabitScheduleKind).optional(),
  intervalDays: z.number().int().min(1).max(365).nullable().optional(),
  weekdays: weekdaysSchema,
  startDayKey: dayKeySchema.nullable().optional(),
  endDayKey: dayKeySchema.nullable().optional(),
  timeOfDay: z.nativeEnum(GrowthHabitTimeOfDay).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: hhmm.nullable().optional(),
  remindMinutesBefore: z.number().int().min(0).max(7 * 24 * 60).nullable().optional(),
  targetValue: z.number().min(0).max(1_000_000).optional(),
  targetUnit: z.string().trim().min(1).max(40).optional(),
  goalPeriod: z.nativeEnum(GrowthHabitGoalPeriod).optional(),
  notes: optionalText,
  stackAfterHabitId: cuidSchema.nullable().optional(),
  stackCue: z.string().trim().max(200).nullable().optional(),
  linkedGoalId: cuidSchema.nullable().optional(),
  checklist: checklistSchema,
};

export const listHabitsQuerySchema = z.object({
  includeArchived: z.enum(['true', 'false']).optional(),
});

export const createHabitBodySchema = z
  .object(habitFields)
  .superRefine((value, ctx) => {
    if (
      (value.frequency === GrowthHabitFrequency.CUSTOM ||
        value.scheduleKind === GrowthHabitScheduleKind.INTERVAL) &&
      !value.intervalDays
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['intervalDays'],
        message: 'Interval kunlari majburiy',
      });
    }
    if (value.scheduleKind === GrowthHabitScheduleKind.WEEKDAYS && !(value.weekdays && value.weekdays.length)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weekdays'],
        message: 'Hafta kunlarini tanlang',
      });
    }
  });

export const updateHabitBodySchema = z
  .object({
    ...Object.fromEntries(
      Object.entries(habitFields).map(([key, schema]) => [key, (schema as z.ZodTypeAny).optional()]),
    ),
    title: habitFields.title.optional(),
    isArchived: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' });

export const checkInHabitBodySchema = z.object({
  dayKey: dayKeySchema.optional(),
  value: z.number().min(0).max(1_000_000).optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

export const createHabitLogBodySchema = z.object({
  dayKey: dayKeySchema.optional(),
  value: z.number().min(0).max(1_000_000),
  note: z.string().trim().max(500).nullable().optional(),
  loggedAt: z.string().datetime({ offset: true }).optional(),
});

export const updateHabitLogBodySchema = z
  .object({
    value: z.number().min(0).max(1_000_000).optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .refine((body) => body.value !== undefined || body.note !== undefined, {
    message: 'At least one field is required',
  });

export const skipHabitBodySchema = z.object({
  dayKey: dayKeySchema.optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

export const checklistTickBodySchema = z.object({
  itemId: cuidSchema,
  dayKey: dayKeySchema.optional(),
  done: z.boolean(),
});

export const habitLogParamsSchema = z.object({
  id: cuidSchema,
  logId: cuidSchema,
});

export const habitRangeQuerySchema = z.object({
  from: dayKeySchema.optional(),
  to: dayKeySchema.optional(),
  period: z.nativeEnum(GrowthHabitProgressPeriod).optional(),
  includeArchived: z.enum(['true', 'false']).optional(),
});

export const dailyGoalsQuerySchema = z.object({
  dayKey: dayKeySchema.optional(),
});

export const upsertDailyGoalsBodySchema = z.object({
  dayKey: dayKeySchema.optional(),
  items: z
    .array(
      z.object({
        id: cuidSchema.optional(),
        title: z.string().trim().min(1).max(200),
        estimatedMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
        isDone: z.boolean().optional(),
      }),
    )
    .max(3),
});

export const updateDailyGoalBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    estimatedMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
    isDone: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.title !== undefined ||
      body.estimatedMinutes !== undefined ||
      body.isDone !== undefined,
    { message: 'At least one field is required' },
  );
