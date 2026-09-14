import { z } from 'zod';

export const personalAnalyticsQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(12).optional(),
});
