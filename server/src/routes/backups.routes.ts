import { Router, type RequestHandler } from 'express';
import multer, { MulterError } from 'multer';

import { env } from '../config/env.js';
import {
  createBackup,
  downloadBackup,
  getBackup,
  listBackups,
  restoreBackup,
} from '../controllers/backups.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { ApiError } from '../utils/api-error.js';
import {
  createBackupBodySchema,
  restoreBackupBodySchema,
} from '../validators/backups.validators.js';
import { idParamsSchema } from '../validators/common.validators.js';

// Held in memory rather than spooled to disk: the upload is read once,
// decompressed and parsed, and BACKUP_MAX_UPLOAD_BYTES keeps the ceiling low
// enough that a temporary file would buy nothing on an ephemeral filesystem.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.BACKUP_MAX_UPLOAD_BYTES, files: 1 },
});

/**
 * Multer rejects an oversized upload with its own error class, which the
 * generic handler would report as an unexplained 500. Translated here so the
 * administrator is told the actual limit.
 */
function uploadBackupFile(): RequestHandler {
  const handler = upload.single('file');
  return (req, res, next) => {
    handler(req, res, (error: unknown) => {
      if (error instanceof MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          const limitMb = Math.floor(env.BACKUP_MAX_UPLOAD_BYTES / 1024 / 1024);
          next(
            ApiError.validation('Backup file is too large', [
              { field: 'file', message: `The file exceeds the ${limitMb} MB limit` },
            ]),
          );
          return;
        }
        next(
          ApiError.validation('Backup upload was rejected', [
            { field: 'file', message: 'Upload a single backup file in the "file" field' },
          ]),
        );
        return;
      }
      next(error as Error | undefined);
    });
  };
}

/**
 * Backup and restore (Zaxira nusxa).
 *
 * Every route is ADMIN / PLATFORM_ADMIN only, enforced in the service layer
 * next to the data access it guards rather than here. `storeId` always comes
 * from the session: a backup can only ever be taken from, downloaded for, or
 * restored into the caller's own store.
 */
export const backupsRouter = Router();

backupsRouter.use(requireAuth);

backupsRouter.get('/', listBackups);
backupsRouter.post('/', validate({ body: createBackupBodySchema }), createBackup);

// Declared before `/:id` so the literal path is not captured as an id.
backupsRouter.post(
  '/restore',
  uploadBackupFile(),
  validate({ body: restoreBackupBodySchema }),
  restoreBackup,
);

backupsRouter.get('/:id', validate({ params: idParamsSchema }), getBackup);
backupsRouter.get('/:id/download', validate({ params: idParamsSchema }), downloadBackup);
