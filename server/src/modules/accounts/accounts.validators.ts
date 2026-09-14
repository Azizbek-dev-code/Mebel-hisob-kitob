import {
  BusinessType,
  validateAuthenticatedBusinessRequestDraft,
  validateCreatePersonalAccountDraft,
  validateRegisterPersonalAccountDraft,
  type CreateAuthenticatedBusinessRequestBody,
  type CreatePersonalAccountRequest,
  type RegisterPersonalAccountRequest,
} from '@furniture-erp/shared';
import { z } from 'zod';

import { entityIdSchema } from '../../validators/common.validators.js';

export const registerPersonalAccountBodySchema = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    password: z.string(),
    passwordConfirmation: z.string(),
    name: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    for (const error of validateRegisterPersonalAccountDraft(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [error.field], message: error.message });
    }
  });

export const createPersonalAccountBodySchema = z
  .object({
    name: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    for (const error of validateCreatePersonalAccountDraft(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [error.field], message: error.message });
    }
  });

export const switchWorkspaceBodySchema = z.object({
  workspaceId: entityIdSchema,
});

export const createAuthenticatedBusinessRequestBodySchema = z
  .object({
    phone: z.string(),
    storeName: z.string(),
    region: z.string(),
    district: z.string(),
    address: z.string(),
    businessType: z.nativeEnum(BusinessType),
  })
  .superRefine((value, ctx) => {
    for (const error of validateAuthenticatedBusinessRequestDraft(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [error.field], message: error.message });
    }
  });

export type RegisterPersonalAccountBody = z.infer<typeof registerPersonalAccountBodySchema> &
  RegisterPersonalAccountRequest;
export type CreatePersonalAccountBody = z.infer<typeof createPersonalAccountBodySchema> &
  CreatePersonalAccountRequest;
export type CreateAuthenticatedBusinessRequestBodyParsed = z.infer<
  typeof createAuthenticatedBusinessRequestBodySchema
> &
  CreateAuthenticatedBusinessRequestBody;
