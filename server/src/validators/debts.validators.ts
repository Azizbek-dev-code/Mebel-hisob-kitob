import { z } from 'zod';

import { paginationQuerySchema } from './common.validators.js';

export const debtListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  filter: z.enum(['ALL', 'OVERDUE', 'UNPAID', 'PARTIALLY_PAID']).optional(),
});

export type DebtListQuery = z.infer<typeof debtListQuerySchema>;
