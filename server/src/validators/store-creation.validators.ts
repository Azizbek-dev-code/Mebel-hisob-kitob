import {
  BusinessType,
  StoreCreationRequestStatus,
  validateStoreCreationDraft,
  type StoreCreationRequestAdmin,
  type StoreCreationRequestPublic,
} from '@furniture-erp/shared';
import { z } from 'zod';

import { cuidSchema, paginationQuerySchema } from './common.validators.js';

const draftShape = {
  applicantFirstName: z.string(),
  applicantLastName: z.string(),
  phone: z.string(),
  email: z.string(),
  username: z.string(),
  password: z.string(),
  passwordConfirmation: z.string(),
  storeName: z.string(),
  region: z.string(),
  district: z.string(),
  address: z.string(),
  businessType: z.nativeEnum(BusinessType).optional(),
};

export const createStoreRequestBodySchema = z.object(draftShape).superRefine((value, ctx) => {
  for (const error of validateStoreCreationDraft(value)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [error.field], message: error.message });
  }
});

export const storeCreationRequestListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(StoreCreationRequestStatus).optional(),
});

export const rejectStoreCreationBodySchema = z.object({
  reason: z
    .string({ required_error: 'Rad etish sababini kiriting' })
    .trim()
    .min(3, 'Rad etish sababini kiriting')
    .max(500, 'Sabab juda uzun'),
});

export const storeCreationRequestIdParamsSchema = z.object({
  id: cuidSchema,
});

export type CreateStoreRequestBody = z.infer<typeof createStoreRequestBodySchema>;
export type StoreCreationRequestListQuery = z.infer<typeof storeCreationRequestListQuerySchema>;
export type RejectStoreCreationBody = z.infer<typeof rejectStoreCreationBodySchema>;

export type { StoreCreationRequestAdmin, StoreCreationRequestPublic };
