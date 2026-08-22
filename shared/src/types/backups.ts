import type { BackupFormat, BackupJobStatus } from '../constants/enums.js';
import type { IsoDateString } from './api.js';

/**
 * Backup and restore (Zaxira nusxa) API contract.
 *
 * Every endpoint is scoped to the authenticated user's store and restricted to
 * ADMIN / PLATFORM_ADMIN. `storeId` is never accepted from the client.
 */

/** Magic string written into every logical export; a restore rejects anything else. */
export const BACKUP_LOGICAL_FORMAT = 'furniture-erp-logical-v1';

/** Document schema version inside a logical export. */
export const BACKUP_LOGICAL_VERSION = 1;

/**
 * Exact phrase the administrator must type to authorise a restore.
 *
 * Compared case-sensitively so a restore cannot be triggered by a stray click
 * or a form default.
 */
export const BACKUP_RESTORE_CONFIRMATION = 'RESTORE';

export interface BackupJobSummary {
  id: string;
  status: BackupJobStatus;
  format: BackupFormat;
  /** Suggested download name — not a server filesystem path. */
  filename: string;
  /** Compressed size in bytes; null until the export succeeds. */
  sizeBytes: number | null;
  /** SHA-256 of the compressed bytes, for verifying a downloaded copy. */
  checksumSha256: string | null;
  errorMessage: string | null;
  /** True for the safety copy taken automatically just before a restore. */
  isAutomatic: boolean;
  /** False once the artefact has been evicted from the server's disk. */
  isDownloadable: boolean;
  createdByName: string | null;
  createdAt: IsoDateString;
  completedAt: IsoDateString | null;
}

export interface BackupListResponse {
  backups: BackupJobSummary[];
}

export interface BackupJobResponse {
  backup: BackupJobSummary;
}

export interface CreateBackupRequest {
  /** Defaults to LOGICAL_JSON. PG_CUSTOM requires the server to enable pg_dump. */
  format?: BackupFormat;
}

export interface RestoreBackupRequest {
  /** Must equal {@link BACKUP_RESTORE_CONFIRMATION} exactly. */
  confirmation: string;
}

/** Rows written per collection by a completed restore. */
export type RestoreRowCounts = Record<string, number>;

export interface RestoreBackupResponse {
  /** Point in time the restored data was captured. */
  backupCreatedAt: IsoDateString;
  restoredCounts: RestoreRowCounts;
  totalRestoredRows: number;
  /**
   * Id of the automatic pre-restore safety export, when one could be taken.
   * Null means the safety copy failed and the previous data is unrecoverable.
   */
  safetyBackupId: string | null;
}
