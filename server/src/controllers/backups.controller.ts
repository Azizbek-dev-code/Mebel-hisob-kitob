import type {
  BackupJobResponse,
  BackupListResponse,
  RestoreBackupResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as backupService from '../services/backup.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../utils/http-response.js';
import type { CreateBackupBody, RestoreBackupBody } from '../validators/backups.validators.js';

function requireUser(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

function actorFrom(req: Request): backupService.BackupActor {
  const user = requireUser(req);
  return { id: user.id, storeId: user.storeId, role: user.role };
}

export const listBackups = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const backups = await backupService.listBackups(user.storeId, user.role);
  sendSuccess<BackupListResponse>(res, { backups });
});

export const createBackup = asyncHandler(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as CreateBackupBody;
  const backup = await backupService.createBackup(actorFrom(req), { format: body.format });
  sendCreated<BackupJobResponse>(res, { backup });
});

export const getBackup = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const backup = await backupService.getBackup(user.storeId, user.role, req.params.id!);
  sendSuccess<BackupJobResponse>(res, { backup });
});

/**
 * Streams the artefact as an attachment.
 *
 * The only endpoint in the API that does not answer with the JSON envelope.
 * Headers go out before the stream starts, so a read error mid-transfer can no
 * longer become an error response — the socket is destroyed instead, which the
 * browser surfaces as a failed download rather than a truncated file that looks
 * complete.
 */
export const downloadBackup = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const download = await backupService.openBackupDownload(
    user.storeId,
    user.role,
    req.params.id!,
  );

  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', `attachment; filename="${download.filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  if (download.sizeBytes !== null) {
    res.setHeader('Content-Length', String(download.sizeBytes));
  }

  download.stream.on('error', () => {
    res.destroy();
  });
  download.stream.pipe(res);
});

export const restoreBackup = asyncHandler(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as RestoreBackupBody;

  if (!req.file) {
    throw ApiError.validation('Backup file is required', [
      { field: 'file', message: 'Choose a backup file to restore' },
    ]);
  }

  const result = await backupService.restoreBackup({
    actor: actorFrom(req),
    confirmation: body.confirmation ?? '',
    file: req.file.buffer,
  });

  sendSuccess<RestoreBackupResponse>(res, result);
});
