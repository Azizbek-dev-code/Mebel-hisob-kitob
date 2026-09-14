import {
  validateRegisterPersonalAccountDraft,
  type CompletePersonalOnboardingRequest,
  type OnboardingStartRequest,
  type SaveOnboardingAnswersRequest,
} from '@furniture-erp/shared';
import { z } from 'zod';

export const onboardingTokenParamsSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{32,64}$/i, 'Onboarding token noto‘g‘ri'),
});

export const startOnboardingBodySchema = z
  .object({
    experimentKey: z.string().trim().max(80).optional(),
  })
  .default({});

export const saveOnboardingAnswersBodySchema = z.object({
  answers: z.unknown(),
  customMonthlyIncomeSom: z.number().int().positive().nullable().optional(),
});

export const completeAuthenticatedOnboardingBodySchema = z
  .object({
    name: z.string().optional(),
  })
  .default({});

export const completePersonalOnboardingBodySchema = z
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

export type StartOnboardingBody = z.infer<typeof startOnboardingBodySchema> & OnboardingStartRequest;
export type SaveOnboardingAnswersBody = z.infer<typeof saveOnboardingAnswersBodySchema> &
  SaveOnboardingAnswersRequest;
export type CompletePersonalOnboardingBody = z.infer<typeof completePersonalOnboardingBodySchema> &
  CompletePersonalOnboardingRequest;

export const idParamsSchema = z.object({
  id: z.string().min(1),
});

export const upsertQuestionBodySchema = z.object({
  key: z.string().trim().max(80).optional(),
  audience: z.enum(['PERSONAL', 'BUSINESS']),
  businessType: z.enum(['FURNITURE', 'CARPET', 'CLOTHING', 'ELECTRONICS', 'OTHER']).nullable().optional(),
  promptUz: z.string().trim().min(1).max(240),
  promptRu: z.string().trim().min(1).max(240),
  hintUz: z.string().trim().max(400).nullable().optional(),
  hintRu: z.string().trim().max(400).nullable().optional(),
  answerType: z.enum(['SINGLE', 'MULTI', 'TEXT']),
  required: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  options: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(80),
        labelUz: z.string().trim().min(1).max(160),
        labelRu: z.string().trim().min(1).max(160),
        allowsOther: z.boolean().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .optional(),
});

export const reorderBodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const upsertNeedBodySchema = z.object({
  key: z.string().trim().max(80).optional(),
  labelUz: z.string().trim().min(1).max(160),
  labelRu: z.string().trim().min(1).max(160),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const upsertMappingBodySchema = z.object({
  questionId: z.string().min(1),
  optionKey: z.string().trim().min(1).max(80),
  needId: z.string().min(1),
  solutionId: z.string().min(1),
});
