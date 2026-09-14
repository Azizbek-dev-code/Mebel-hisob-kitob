import { PERSONAL_PLAN_KEY } from '@furniture-erp/shared';
import { z } from 'zod';

export const selectPersonalPlanBodySchema = z.object({
  planKey: z.enum([PERSONAL_PLAN_KEY.TRIAL, PERSONAL_PLAN_KEY.PAID]),
});
