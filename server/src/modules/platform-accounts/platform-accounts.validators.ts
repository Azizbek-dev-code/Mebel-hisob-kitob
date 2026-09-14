import { z } from 'zod';
import {
  BusinessType,
  PlatformAccountDisplayStatus,
  WorkspaceType,
} from '@furniture-erp/shared';

export const platformAccountListQuerySchema = z.object({
  accountType: z.nativeEnum(WorkspaceType).optional(),
  status: z.nativeEnum(PlatformAccountDisplayStatus).optional(),
  businessType: z.nativeEnum(BusinessType).optional(),
});

export type PlatformAccountListQueryInput = z.infer<typeof platformAccountListQuerySchema>;

export const platformAccountIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(80),
});
