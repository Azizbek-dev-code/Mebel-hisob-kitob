import { GrowthFocusKind } from '@furniture-erp/shared';
import { z } from 'zod';

import { cuidSchema } from '../../../validators/common.validators.js';

export const startFocusBodySchema = z.object({
  plannedMinutes: z.number().int().min(1).max(90),
  kind: z.nativeEnum(GrowthFocusKind).optional(),
  todoId: cuidSchema.nullable().optional(),
  habitId: cuidSchema.nullable().optional(),
  linkedGoalId: cuidSchema.nullable().optional(),
});

export const completeFocusBodySchema = z.object({
  interrupted: z.boolean().optional(),
  clientReportedSeconds: z.number().int().min(0).max(24 * 60 * 60).nullable().optional(),
});
