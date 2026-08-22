import { z } from 'zod';

import { calendarDateSchema, cuidSchema, paginationQuerySchema } from './common.validators.js';

/**
 * `eventType` and `entityType` are validated as plain strings rather than
 * against the shared enums: the table keeps events written by older builds, and
 * a filter that cannot express them would hide rows the admin can plainly see.
 */
export const auditListQuerySchema = paginationQuerySchema.extend({
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
  actorUserId: cuidSchema.optional(),
  eventType: z.string().trim().max(64).optional(),
  entityType: z.string().trim().max(64).optional(),
  search: z.string().trim().max(200).optional(),
});

export type AuditListQuery = z.infer<typeof auditListQuerySchema>;
