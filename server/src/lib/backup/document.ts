import {
  BACKUP_LOGICAL_FORMAT,
  BACKUP_LOGICAL_VERSION,
} from '@furniture-erp/shared';

import { ApiError } from '../../utils/api-error.js';
import { BACKUP_MODEL_KEYS } from './models.js';
import { decodeRow } from './serialization.js';

/**
 * The on-disk shape of a logical export.
 *
 * `data` is keyed by the collection names in `BACKUP_MODELS`; every value is an
 * array of whole table rows with BigInt and Date values tagged (see
 * `serialization.ts`).
 */
export interface BackupStoreProfile {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currency: string;
  timezone: string;
}

export interface BackupDocument {
  version: number;
  format: string;
  createdAt: string;
  storeId: string;
  store: BackupStoreProfile;
  data: Record<string, Record<string, unknown>[]>;
}

/** A parsed document whose rows have been decoded back into BigInt / Date. */
export interface DecodedBackupDocument extends Omit<BackupDocument, 'data'> {
  data: Record<string, Record<string, unknown>[]>;
}

function invalid(message: string): ApiError {
  return ApiError.validation('Backup file is not valid', [{ field: 'file', message }]);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parses and structurally validates an uploaded export.
 *
 * Rejects anything that is not a `furniture-erp-logical-v1` document of a
 * version this build understands. Row *contents* are not validated here — the
 * repository narrows each row to the columns Prisma knows about, and the
 * database enforces the rest inside the restore transaction.
 */
export function parseBackupDocument(json: string): DecodedBackupDocument {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw invalid('The file is not readable JSON. Upload the .json.gz produced by this system.');
  }

  if (!isPlainObject(raw)) {
    throw invalid('The file does not contain a backup document.');
  }

  if (raw.format !== BACKUP_LOGICAL_FORMAT) {
    throw invalid(
      `Unrecognised backup format. Expected "${BACKUP_LOGICAL_FORMAT}", found "${String(raw.format)}".`,
    );
  }

  if (raw.version !== BACKUP_LOGICAL_VERSION) {
    throw invalid(
      `Unsupported backup version ${String(raw.version)}. This system reads version ${BACKUP_LOGICAL_VERSION}.`,
    );
  }

  if (typeof raw.storeId !== 'string' || !raw.storeId) {
    throw invalid('The backup does not name the store it came from.');
  }

  if (!isPlainObject(raw.store) || typeof raw.store.name !== 'string') {
    throw invalid('The backup is missing its store profile.');
  }

  if (!isPlainObject(raw.data)) {
    throw invalid('The backup contains no data section.');
  }

  const data: Record<string, Record<string, unknown>[]> = {};
  for (const key of BACKUP_MODEL_KEYS) {
    const rows = raw.data[key];
    // A collection may be absent: an export taken before a table existed is
    // still restorable, it simply leaves that table empty.
    if (rows === undefined) {
      data[key] = [];
      continue;
    }
    if (!Array.isArray(rows)) {
      throw invalid(`Collection "${key}" is not a list of rows.`);
    }
    data[key] = rows.map((row, index) => {
      if (!isPlainObject(row)) {
        throw invalid(`Row ${index} of "${key}" is not an object.`);
      }
      return decodeRow(row);
    });
  }

  const store = raw.store as unknown as BackupStoreProfile;

  return {
    version: BACKUP_LOGICAL_VERSION,
    format: BACKUP_LOGICAL_FORMAT,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
    storeId: raw.storeId,
    store,
    data,
  };
}
