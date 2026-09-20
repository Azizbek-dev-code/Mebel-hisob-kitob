import { GrowthAimStatus } from '@furniture-erp/shared';
import { z } from 'zod';

import { flexibleDateSchema } from '../../../validators/common.validators.js';

export const createAimBodySchema = z.object({
  title: z.string().trim().min(2).max(160),
  note: z.string().trim().max(2000).nullable().optional(),
  targetDate: flexibleDateSchema.nullable().optional(),
});

export const updateAimBodySchema = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    note: z.string().trim().max(2000).nullable().optional(),
    targetDate: flexibleDateSchema.nullable().optional(),
    status: z.nativeEnum(GrowthAimStatus).optional(),
  })
  .refine(
    (body) =>
      body.title !== undefined ||
      body.note !== undefined ||
      body.targetDate !== undefined ||
      body.status !== undefined,
    { message: 'At least one field is required' },
  );
