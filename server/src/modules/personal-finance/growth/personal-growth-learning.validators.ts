import {
  GrowthLearningCategory,
  GrowthLearningGoalStatus,
} from '@furniture-erp/shared';
import { z } from 'zod';

import { cuidSchema, isoDateTimeSchema } from '../../../validators/common.validators.js';

const optionalText = z.string().trim().max(2000).nullable().optional();

export const listLearningQuerySchema = z.object({
  includeArchived: z.enum(['true', 'false']).optional(),
});

export const createLearningGoalBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalText,
  category: z.nativeEnum(GrowthLearningCategory).optional(),
  targetValue: z.number().positive().max(1_000_000),
  targetUnit: z.string().trim().min(1).max(40).optional(),
  currentValue: z.number().min(0).max(1_000_000).optional(),
  deadline: isoDateTimeSchema.nullable().optional(),
  milestones: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        targetValue: z.number().positive().max(1_000_000),
      }),
    )
    .max(12)
    .optional(),
});

export const updateLearningGoalBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: optionalText,
    category: z.nativeEnum(GrowthLearningCategory).optional(),
    status: z.nativeEnum(GrowthLearningGoalStatus).optional(),
    targetValue: z.number().positive().max(1_000_000).optional(),
    targetUnit: z.string().trim().min(1).max(40).optional(),
    currentValue: z.number().min(0).max(1_000_000).optional(),
    deadline: isoDateTimeSchema.nullable().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .refine(
    (body) =>
      body.title !== undefined ||
      body.description !== undefined ||
      body.category !== undefined ||
      body.status !== undefined ||
      body.targetValue !== undefined ||
      body.targetUnit !== undefined ||
      body.currentValue !== undefined ||
      body.deadline !== undefined ||
      body.sortOrder !== undefined,
    { message: 'At least one field is required' },
  );

export const logLearningSessionBodySchema = z.object({
  goalId: cuidSchema.nullable().optional(),
  minutes: z.number().int().min(1).max(240),
  note: z.string().trim().max(500).nullable().optional(),
  startedAt: isoDateTimeSchema.nullable().optional(),
});

export const createMilestoneBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  targetValue: z.number().positive().max(1_000_000),
});
