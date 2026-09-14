import { ReferralWithdrawalStatus } from '@furniture-erp/shared';
import { z } from 'zod';

import { cuidSchema } from '../../validators/common.validators.js';

export const referralCodeParamsSchema = z.object({
  code: z.string().trim().min(1).max(16),
});

export const referralClickBodySchema = z.object({
  code: z.string().trim().min(1).max(16),
});

export const referralWithdrawalListQuerySchema = z.object({
  status: z.nativeEnum(ReferralWithdrawalStatus).optional(),
});

export const rejectReferralWithdrawalBodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const referralWithdrawalIdParamsSchema = z.object({
  id: cuidSchema,
});
