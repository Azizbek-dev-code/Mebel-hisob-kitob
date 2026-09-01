import {
  STORE_RESET_CONFIRMATION,
  STORE_TIMEZONE_OPTIONS,
  type ResetStoreRequest,
  type UpdateStoreProfileRequest,
} from '@furniture-erp/shared';
import { z } from 'zod';

export const updateStoreProfileBodySchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200).optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    address: z.string().trim().max(500).nullable().optional(),
    timezone: z.enum(STORE_TIMEZONE_OPTIONS).optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.phone !== undefined ||
      body.address !== undefined ||
      body.timezone !== undefined,
    { message: 'At least one field is required' },
  ) satisfies z.ZodType<UpdateStoreProfileRequest>;

export type UpdateStoreProfileBody = z.infer<typeof updateStoreProfileBodySchema>;

export const resetStoreBodySchema = z.object({
  confirmation: z
    .string()
    .refine((value) => value === STORE_RESET_CONFIRMATION, {
      message: `Type ${STORE_RESET_CONFIRMATION} exactly to confirm`,
    }),
}) satisfies z.ZodType<ResetStoreRequest>;

export type ResetStoreBody = z.infer<typeof resetStoreBodySchema>;
