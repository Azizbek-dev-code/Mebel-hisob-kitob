import { GrowthEventPriority, GrowthEventRecurrence } from '@furniture-erp/shared';
import { z } from 'zod';

import { calendarDateSchema, cuidSchema, isoDateTimeSchema } from '../../../validators/common.validators.js';

const optionalNote = z.string().trim().max(2000).nullable().optional();
const optionalCategory = z.string().trim().max(60).nullable().optional();

export const listGrowthEventsQuerySchema = z.object({
  from: z.union([calendarDateSchema, isoDateTimeSchema]),
  to: z.union([calendarDateSchema, isoDateTimeSchema]),
});

export const dayPlanQuerySchema = z.object({
  date: calendarDateSchema,
});

export const upcomingRemindersQuerySchema = z.object({
  withinMinutes: z.coerce.number().int().min(5).max(7 * 24 * 60).optional(),
});

export const createGrowthEventBodySchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    note: optionalNote,
    category: optionalCategory,
    priority: z.nativeEnum(GrowthEventPriority).optional(),
    startsAt: isoDateTimeSchema,
    endsAt: isoDateTimeSchema.nullable().optional(),
    allDay: z.boolean().optional(),
    recurrence: z.nativeEnum(GrowthEventRecurrence).optional(),
    intervalDays: z.number().int().min(1).max(365).nullable().optional(),
    remindMinutesBefore: z.number().int().min(0).max(7 * 24 * 60).nullable().optional(),
    linkedGoalId: cuidSchema.nullable().optional(),
    linkedTodoId: cuidSchema.nullable().optional(),
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

export const updateGrowthEventBodySchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    note: optionalNote,
    category: optionalCategory,
    priority: z.nativeEnum(GrowthEventPriority).optional(),
    startsAt: isoDateTimeSchema.optional(),
    endsAt: isoDateTimeSchema.nullable().optional(),
    allDay: z.boolean().optional(),
    recurrence: z.nativeEnum(GrowthEventRecurrence).optional(),
    intervalDays: z.number().int().min(1).max(365).nullable().optional(),
    remindMinutesBefore: z.number().int().min(0).max(7 * 24 * 60).nullable().optional(),
    isCancelled: z.boolean().optional(),
    linkedGoalId: cuidSchema.nullable().optional(),
    linkedTodoId: cuidSchema.nullable().optional(),
  })
  .refine(
    (body) =>
      body.title !== undefined ||
      body.note !== undefined ||
      body.category !== undefined ||
      body.priority !== undefined ||
      body.startsAt !== undefined ||
      body.endsAt !== undefined ||
      body.allDay !== undefined ||
      body.recurrence !== undefined ||
      body.intervalDays !== undefined ||
      body.remindMinutesBefore !== undefined ||
      body.isCancelled !== undefined ||
      body.linkedGoalId !== undefined ||
      body.linkedTodoId !== undefined,
    { message: 'At least one field is required' },
  );
