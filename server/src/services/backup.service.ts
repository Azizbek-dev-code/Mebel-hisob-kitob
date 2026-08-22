import {
  AuditEntityType,
  AuditEventType,
  BACKUP_LOGICAL_FORMAT,
  BACKUP_LOGICAL_VERSION,
  BACKUP_RESTORE_CONFIRMATION,
  BackupFormat,
  BackupJobStatus,
  UserRole,
  type BackupJobSummary,
  type RestoreBackupResponse,
} from '@furniture-erp/shared';

import { env } from '../config/env.js';
import type { BackupDocument } from '../lib/backup/document.js';
import { parseBackupDocument } from '../lib/backup/document.js';
import { checkPgDumpAvailability } from '../lib/backup/pg-dump.js';
import { encodeRow } from '../lib/backup/serialization.js';
import {
  BackupTooLargeError,
  backupArtefactExists,
  buildBackupFilename,
  openBackupArtefact,
  readUploadedDocument,
  writeBackupArtefact,
} from '../lib/backup/storage.js';
import * as backupRepository from '../repositories/backup.repository.js';
import type { BackupJobRecord } from '../repositories/backup.repository.js';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';
import { recordAudit } from './audit.service.js';

/** Backups expose every row in the store, including password hashes. Admins only. */
const BACKUP_MANAGERS: ReadonlySet<string> = new Set([UserRole.ADMIN, UserRole.PLATFORM_ADMIN]);

/** Most recent jobs returned by the list endpoint. */
const BACKUP_LIST_LIMIT = 20;

export function canManageBackups(role: string): boolean {
  return BACKUP_MANAGERS.has(role);
}

export function assertCanManageBackups(role: string): void {
  if (!canManageBackups(role)) {
    throw ApiError.forbidden('Only store administrators can manage backups');
  }
}

export interface BackupActor {
  id: string;
  storeId: string;
  role: string;
}

async function toSummary(job: BackupJobRecord): Promise<BackupJobSummary> {
  const isDownloadable =
    job.status === BackupJobStatus.SUCCEEDED &&
    (await backupArtefactExists(job.storeId, job.id));

  return {
    id: job.id,
    status: job.status as BackupJobSummary['status'],
    format: job.format as BackupJobSummary['format'],
    filename: job.filename,
    // File sizes are far below Number.MAX_SAFE_INTEGER; the column is BigInt
    // only because Prisma has no unsigned 32-bit type.
    sizeBytes: job.sizeBytes === null ? null : Number(job.sizeBytes),
    checksumSha256: job.checksumSha256,
    errorMessage: job.errorMessage,
    isAutomatic: job.isAutomatic,
    isDownloadable,
    createdByName: job.createdBy?.fullName ?? null,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

export async function listBackups(
  storeId: string,
  actorRole: string,
): Promise<BackupJobSummary[]> {
  assertCanManageBackups(actorRole);
  const jobs = await backupRepository.listBackupJobs(storeId, BACKUP_LIST_LIMIT);
  return Promise.all(jobs.map(toSummary));
}

export async function getBackup(
  storeId: string,
  actorRole: string,
  id: string,
): Promise<BackupJobSummary> {
  assertCanManageBackups(actorRole);
  const job = await backupRepository.findBackupJob(storeId, id);
  if (!job) throw ApiError.notFound('Backup not found');
  return toSummary(job);
}

/**
 * Serialises a store dump into the versioned document written to disk.
 *
 * The whole document is assembled in memory. At the scale this system runs at
 * (a single furniture store) that is a few megabytes; a store with millions of
 * rows would need a streaming writer instead.
 */
function buildDocument(
  storeId: string,
  dump: backupRepository.StoreDump,
  createdAt: Date,
): BackupDocument {
  const data: Record<string, Record<string, unknown>[]> = {};
  for (const [key, rows] of Object.entries(dump.data)) {
    data[key] = rows.map(encodeRow);
  }

  return {
    version: BACKUP_LOGICAL_VERSION,
    format: BACKUP_LOGICAL_FORMAT,
    createdAt: createdAt.toISOString(),
    storeId,
    store: dump.store,
    data,
  };
}

export interface CreateBackupOptions {
  format?: BackupFormat;
  /** Set for the safety copy taken automatically before a restore. */
  isAutomatic?: boolean;
}

/**
 * Exports the caller's store to a gzipped JSON artefact.
 *
 * Runs inline rather than on a queue: the job row exists to record the outcome
 * and to name the file, not to hand the work to a background worker. The
 * request therefore blocks for the length of the export.
 *
 * The artefact contains password hashes. That is intentional — a restore has to
 * put working logins back — and it is why every endpoint here is admin-only and
 * why `backups/` is gitignored.
 */
export async function createBackup(
  actor: BackupActor,
  options: CreateBackupOptions = {},
): Promise<BackupJobSummary> {
  assertCanManageBackups(actor.role);

  const format = options.format ?? BackupFormat.LOGICAL_JSON;
  if (format === BackupFormat.PG_CUSTOM) {
    const availability = await checkPgDumpAvailability();
    throw ApiError.badRequest(
      `Full-database pg_dump backups are not available on this server (${
        availability.reason ?? 'not implemented'
      }). Use the JSON backup instead.`,
    );
  }

  const createdAt = new Date();
  const job = await backupRepository.createBackupJob({
    storeId: actor.storeId,
    createdById: actor.id,
    filename: buildBackupFilename(createdAt),
    format,
    isAutomatic: options.isAutomatic ?? false,
  });

  try {
    const dump = await backupRepository.dumpStoreData(actor.storeId);
    const document = buildDocument(actor.storeId, dump, createdAt);
    const artefact = await writeBackupArtefact(
      actor.storeId,
      job.id,
      JSON.stringify(document),
    );

    const succeeded = await backupRepository.markBackupJobSucceeded(job.id, artefact);
    logger.info('Backup created', {
      backupId: job.id,
      storeId: actor.storeId,
      sizeBytes: artefact.sizeBytes,
    });
    const summary = await toSummary(succeeded);
    await recordAudit({
      storeId: actor.storeId,
      actorUserId: actor.id,
      eventType: AuditEventType.BACKUP_CREATED,
      entityType: AuditEntityType.BACKUP,
      entityId: summary.id,
      summary: `Backup created: ${summary.filename}`,
      metadata: { format: summary.format, sizeBytes: summary.sizeBytes },
    });
    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Backup failed', { backupId: job.id, storeId: actor.storeId, message });
    await backupRepository.markBackupJobFailed(job.id, message).catch(() => undefined);
    throw ApiError.internal('Could not create the backup. Check the server logs.');
  }
}

export interface BackupDownload {
  filename: string;
  stream: NodeJS.ReadableStream;
  sizeBytes: number | null;
}

/**
 * Opens a completed artefact for streaming.
 *
 * The path is derived from the job row, never from the request, so the id
 * cannot be used to reach a file outside `BACKUP_DIR` — and the job is looked
 * up scoped by `storeId`, so one store cannot download another's export.
 */
export async function openBackupDownload(
  storeId: string,
  actorRole: string,
  id: string,
): Promise<BackupDownload> {
  assertCanManageBackups(actorRole);

  const job = await backupRepository.findBackupJob(storeId, id);
  if (!job) throw ApiError.notFound('Backup not found');

  if (job.status !== BackupJobStatus.SUCCEEDED) {
    throw ApiError.badRequest('This backup did not complete, so there is nothing to download.');
  }

  if (!(await backupArtefactExists(storeId, id))) {
    // Expected on hosts with an ephemeral filesystem: the row outlives the file.
    throw new ApiError(
      410,
      'NOT_FOUND',
      'This backup file is no longer stored on the server. Create a new backup and download it right away.',
    );
  }

  return {
    filename: job.filename,
    stream: openBackupArtefact(storeId, id),
    sizeBytes: job.sizeBytes === null ? null : Number(job.sizeBytes),
  };
}

export interface RestoreBackupInput {
  actor: BackupActor;
  confirmation: string;
  file: Buffer;
}

/**
 * Replaces the caller's store data with the contents of an uploaded backup.
 *
 * Destructive and irreversible in effect. What this does and does not promise:
 *
 * * The delete-and-reinsert runs inside one database transaction, so the
 *   database is never left half-restored — a failure rolls back to the state
 *   before the upload.
 * * That guarantee stops at the database. The safety export written just
 *   beforehand is a file on disk and is not part of the transaction, and
 *   neither are uploaded product images, which are not backed up at all.
 * * Other stores are untouched; every statement is scoped by `storeId`.
 */
export async function restoreBackup(input: RestoreBackupInput): Promise<RestoreBackupResponse> {
  const { actor, confirmation, file } = input;
  assertCanManageBackups(actor.role);

  if (confirmation !== BACKUP_RESTORE_CONFIRMATION) {
    throw ApiError.validation('Restore was not confirmed', [
      {
        field: 'confirmation',
        message: `Type ${BACKUP_RESTORE_CONFIRMATION} exactly to confirm this destructive action`,
      },
    ]);
  }

  if (file.length === 0) {
    throw ApiError.validation('Backup file is required', [
      { field: 'file', message: 'Choose a backup file to restore' },
    ]);
  }

  if (file.length > env.BACKUP_MAX_UPLOAD_BYTES) {
    throw ApiError.validation('Backup file is too large', [
      {
        field: 'file',
        message: `The file exceeds the ${Math.floor(env.BACKUP_MAX_UPLOAD_BYTES / 1024 / 1024)} MB limit`,
      },
    ]);
  }

  let json: string;
  try {
    json = readUploadedDocument(file);
  } catch (error) {
    if (error instanceof BackupTooLargeError) {
      throw ApiError.validation('Backup file is too large', [
        {
          field: 'file',
          message: 'The file expands to more data than this server will process in one restore.',
        },
      ]);
    }
    throw ApiError.validation('Backup file is not valid', [
      { field: 'file', message: 'The file could not be decompressed. Upload the original .json.gz.' },
    ]);
  }

  const document = parseBackupDocument(json);

  // A cross-store restore is rejected outright, including for PLATFORM_ADMIN.
  // Rewriting the ids to graft one store's data onto another would collide on
  // every per-store unique key (sale numbers, customer phones, user emails),
  // and there is no safe automatic answer to those collisions.
  if (document.storeId !== actor.storeId) {
    throw ApiError.validation('Backup belongs to a different store', [
      {
        field: 'file',
        message:
          'This backup was taken from another store and cannot be restored here.',
      },
    ]);
  }

  // Best effort: if the safety copy cannot be written the restore still
  // proceeds, but the response says so, because that is the difference between
  // a reversible mistake and an unrecoverable one.
  let safetyBackupId: string | null = null;
  try {
    const safety = await createBackup(actor, { isAutomatic: true });
    safetyBackupId = safety.id;
  } catch (error) {
    logger.error('Pre-restore safety backup failed', {
      storeId: actor.storeId,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  const result = await backupRepository.restoreStoreData({
    storeId: actor.storeId,
    actorId: actor.id,
    document,
  });

  logger.warn('Store data restored from backup', {
    storeId: actor.storeId,
    actorId: actor.id,
    backupCreatedAt: document.createdAt,
    totalRows: result.totalRows,
    safetyBackupId,
    actorReinstated: result.actorReinstated,
  });

  await recordAudit({
    storeId: actor.storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.BACKUP_RESTORED,
    entityType: AuditEntityType.BACKUP,
    entityId: safetyBackupId,
    summary: `Store restored from backup (${result.totalRows} rows)`,
    metadata: {
      backupCreatedAt: document.createdAt,
      totalRestoredRows: result.totalRows,
      safetyBackupId,
    },
  });

  return {
    backupCreatedAt: document.createdAt,
    restoredCounts: result.counts,
    totalRestoredRows: result.totalRows,
    safetyBackupId,
  };
}
