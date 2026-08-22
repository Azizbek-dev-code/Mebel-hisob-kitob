import { BackupFormat } from '@furniture-erp/shared';
import { z } from 'zod';

export const createBackupBodySchema = z
  .object({
    format: z.nativeEnum(BackupFormat).optional(),
  })
  .strict();

export type CreateBackupBody = z.infer<typeof createBackupBodySchema>;

/**
 * Restore arrives as multipart, so `confirmation` is a form field rather than
 * JSON. The exact-phrase check lives in the service, next to the destructive
 * operation it guards, so a future caller cannot reach the restore without it.
 */
export const restoreBackupBodySchema = z.object({
  confirmation: z.string({ required_error: 'Confirmation is required' }),
});

export type RestoreBackupBody = z.infer<typeof restoreBackupBodySchema>;
