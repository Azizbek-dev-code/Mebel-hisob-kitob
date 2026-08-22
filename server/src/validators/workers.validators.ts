import { AssemblyTaskStatus, WorkerResponsibility } from '@furniture-erp/shared';
import { z } from 'zod';

import {
  calendarDateSchema,
  cuidSchema,
  paginationQuerySchema,
} from './common.validators.js';

const responsibilitySchema = z.nativeEnum(WorkerResponsibility);

export const workerListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  responsibility: responsibilitySchema.optional(),
});

export const createWorkerBodySchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username may only contain letters, numbers, dots, underscores and hyphens'),
  phone: z.string().trim().min(5).max(40).optional(),
  password: z.string().min(8).max(128),
  responsibilities: z.array(responsibilitySchema).min(1).max(10),
  isActive: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
  email: z.string().trim().email().max(160).optional(),
});

export const updateWorkerBodySchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().min(5).max(40).nullable().optional(),
  responsibilities: z.array(responsibilitySchema).min(1).max(10).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const resetWorkerPasswordBodySchema = z.object({
  password: z.string().min(8).max(128),
});

export const workerSalesQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
});

export const workerTasksQuerySchema = z.object({
  status: z.nativeEnum(AssemblyTaskStatus).optional(),
});

export const workerOptionsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  responsibility: responsibilitySchema.optional(),
});

export const workerIdParamsSchema = z.object({
  id: cuidSchema,
});

export type WorkerListQuery = z.infer<typeof workerListQuerySchema>;
export type CreateWorkerBody = z.infer<typeof createWorkerBodySchema>;
export type UpdateWorkerBody = z.infer<typeof updateWorkerBodySchema>;
export type ResetWorkerPasswordBody = z.infer<typeof resetWorkerPasswordBodySchema>;
export type WorkerSalesQuery = z.infer<typeof workerSalesQuerySchema>;
export type WorkerTasksQuery = z.infer<typeof workerTasksQuerySchema>;
export type WorkerOptionsQuery = z.infer<typeof workerOptionsQuerySchema>;
