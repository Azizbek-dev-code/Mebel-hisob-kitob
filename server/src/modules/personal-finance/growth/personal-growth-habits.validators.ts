import { GrowthHabitFrequency } from '@furniture-erp/shared';
import { z } from 'zod';

import { cuidSchema } from '../../../validators/common.validators.js';

const optionalText = z.string().trim().max(2000).nullable().optional();
const optionalCategory = z.string().trim().max(60).nullable().optional();
const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const listHabitsQuerySchema = z.object({
  includeArchived: z.enum(['true', 'false']).optional(),
});

export const createHabitBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: optionalText,
    category: optionalCategory,
    frequency: z.nativeEnum(GrowthHabitFrequency).optional(),
    intervalDays: z.number().int().min(1).max(365).nullable().optional(),
    targetValue: z.number().positive().max(1_000_000).optional(),
    targetUnit: z.string().trim().min(1).max(40).optional(),
    remindMinutesBefore: z.number().int().min(0).max(7 * 24 * 60).nullable().optional(),
    linkedGoalId: cuidSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.frequency === GrowthHabitFrequency.CUSTOM && !value.intervalDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['intervalDays'],
        message: 'Interval kunlari majburiy',
      });
    }
  });

export const updateHabitBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: optionalText,
    category: optionalCategory,
    frequency: z.nativeEnum(GrowthHabitFrequency).optional(),
    intervalDays: z.number().int().min(1).max(365).nullable().optional(),
    targetValue: z.number().positive().max(1_000_000).optional(),
    targetUnit: z.string().trim().min(1).max(40).optional(),
    remindMinutesBefore: z.number().int().min(0).max(7 * 24 * 60).nullable().optional(),
    linkedGoalId: cuidSchema.nullable().optional(),
    isArchived: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .refine(
    (body) =>
      body.title !== undefined ||
      body.description !== undefined ||
      body.category !== undefined ||
      body.frequency !== undefined ||
      body.intervalDays !== undefined ||
      body.targetValue !== undefined ||
      body.targetUnit !== undefined ||
      body.remindMinutesBefore !== undefined ||
      body.linkedGoalId !== undefined ||
      body.isArchived !== undefined ||
      body.sortOrder !== undefined,
    { message: 'At least one field is required' },
  );

export const checkInHabitBodySchema = z.object({
  dayKey: dayKeySchema.optional(),
  value: z.number().positive().max(1_000_000).optional(),
  note: z.string().trim().max(500).nullable().optional(),
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
