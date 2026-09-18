import {
  GrowthEventPriority,
  GrowthEventRecurrence,
  GrowthTodoStatus,
} from '@furniture-erp/shared';
import { z } from 'zod';

import { cuidSchema, isoDateTimeSchema } from '../../../validators/common.validators.js';

const optionalText = z.string().trim().max(2000).nullable().optional();
const optionalCategory = z.string().trim().max(60).nullable().optional();

export const listTodosQuerySchema = z.object({
  status: z
    .enum([
      GrowthTodoStatus.TODO,
      GrowthTodoStatus.IN_PROGRESS,
      GrowthTodoStatus.DONE,
      GrowthTodoStatus.CANCELLED,
      'OPEN',
    ])
    .optional(),
});

export const suggestTodoBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export const createTodoBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: optionalText,
    priority: z.nativeEnum(GrowthEventPriority).optional(),
    category: optionalCategory,
    dueAt: isoDateTimeSchema.nullable().optional(),
    remindMinutesBefore: z.number().int().min(0).max(7 * 24 * 60).nullable().optional(),
    estimatedMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
    recurrence: z.nativeEnum(GrowthEventRecurrence).optional(),
    intervalDays: z.number().int().min(1).max(365).nullable().optional(),
    isDailyFocus: z.boolean().optional(),
    linkedGoalId: cuidSchema.nullable().optional(),
    linkedCalendarEventId: cuidSchema.nullable().optional(),
    addToCalendar: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.recurrence === GrowthEventRecurrence.CUSTOM && !value.intervalDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['intervalDays'],
        message: 'Interval kunlari majburiy',
      });
    }
  });

export const updateTodoBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: optionalText,
    priority: z.nativeEnum(GrowthEventPriority).optional(),
    status: z.nativeEnum(GrowthTodoStatus).optional(),
    category: optionalCategory,
    dueAt: isoDateTimeSchema.nullable().optional(),
    remindMinutesBefore: z.number().int().min(0).max(7 * 24 * 60).nullable().optional(),
    estimatedMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
    actualMinutes: z.number().int().min(0).max(7 * 24 * 60).optional(),
    recurrence: z.nativeEnum(GrowthEventRecurrence).optional(),
    intervalDays: z.number().int().min(1).max(365).nullable().optional(),
    isDailyFocus: z.boolean().optional(),
    linkedGoalId: cuidSchema.nullable().optional(),
    linkedCalendarEventId: cuidSchema.nullable().optional(),
  })
  .refine(
    (body) =>
      body.title !== undefined ||
      body.description !== undefined ||
      body.priority !== undefined ||
      body.status !== undefined ||
      body.category !== undefined ||
      body.dueAt !== undefined ||
      body.remindMinutesBefore !== undefined ||
      body.estimatedMinutes !== undefined ||
      body.actualMinutes !== undefined ||
      body.recurrence !== undefined ||
      body.intervalDays !== undefined ||
      body.isDailyFocus !== undefined ||
      body.linkedGoalId !== undefined ||
      body.linkedCalendarEventId !== undefined,
    { message: 'At least one field is required' },
  );
