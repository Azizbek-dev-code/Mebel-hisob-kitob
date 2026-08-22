import {
  MAX_MONEY_AMOUNT,
  WorkerCompensationType,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import { z } from 'zod';

import {
  calendarDateSchema,
  cuidSchema,
  flexibleDateSchema,
  idParamsSchema,
} from './common.validators.js';

const compensationTypeSchema = z.nativeEnum(WorkerCompensationType);
const responsibilitySchema = z.nativeEnum(WorkerResponsibility);
const compensationValueSchema = z
  .number({ invalid_type_error: 'value must be a number' })
  .int('value must be a whole number')
  .positive('value must be greater than zero')
  .max(MAX_MONEY_AMOUNT, 'value is too large');

export const createWorkerCompensationRuleBodySchema = z
  .object({
    responsibility: responsibilitySchema,
    type: compensationTypeSchema,
    value: compensationValueSchema,
    effectiveFrom: flexibleDateSchema,
    effectiveTo: flexibleDateSchema.nullable().optional(),
    notes: z.string().trim().max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateWorkerCompensationRuleBodySchema = z
  .object({
    value: compensationValueSchema.optional(),
    effectiveFrom: flexibleDateSchema.optional(),
    effectiveTo: flexibleDateSchema.nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const workerCompensationRuleListQuerySchema = z.object({
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

function isRealCalendarDate(value: string): boolean {
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

const previewDateSchema = calendarDateSchema.refine(isRealCalendarDate, 'Enter a date that exists');

export const workerCompensationPreviewQuerySchema = z
  .object({
    from: previewDateSchema,
    to: previewDateSchema,
  })
  .superRefine((value, ctx) => {
    if (value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['from'],
        message: 'The start date must not be after the end date',
      });
    }
  });

/** Same period shape as preview — settle posts COMMISSION rows for the range. */
export const settleWorkerCompensationBodySchema = workerCompensationPreviewQuerySchema;

export const workerCompensationRuleParamsSchema = z.object({
  id: cuidSchema,
  ruleId: cuidSchema,
});

export const workerCompensationWorkerParamsSchema = idParamsSchema;

export type CreateWorkerCompensationRuleBody = z.infer<
  typeof createWorkerCompensationRuleBodySchema
>;
export type UpdateWorkerCompensationRuleBody = z.infer<
  typeof updateWorkerCompensationRuleBodySchema
>;
export type WorkerCompensationRuleListQuery = z.infer<
  typeof workerCompensationRuleListQuerySchema
>;
export type WorkerCompensationPreviewQuery = z.infer<typeof workerCompensationPreviewQuerySchema>;
export type SettleWorkerCompensationBody = z.infer<typeof settleWorkerCompensationBodySchema>;
export type WorkerCompensationRuleParams = z.infer<typeof workerCompensationRuleParamsSchema>;
export type WorkerCompensationWorkerParams = z.infer<typeof workerCompensationWorkerParamsSchema>;
