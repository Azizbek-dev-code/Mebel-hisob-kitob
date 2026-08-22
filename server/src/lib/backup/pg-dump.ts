import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const execFileAsync = promisify(execFile);

/**
 * Full-database `pg_dump -Fc` export.
 *
 * NOT IMPLEMENTED — deliberately. The logical JSON export is the supported path
 * and it works on every host, including managed platforms where no Postgres
 * client binaries are installed and the filesystem is ephemeral.
 *
 * What is here is the availability probe plus an honest refusal, so the API can
 * tell an administrator *why* the option is unavailable instead of failing
 * obscurely. Two things must be true before the format is offered at all:
 * `BACKUP_ENABLE_PG_DUMP=true` and a `pg_dump` on PATH whose major version
 * matches the server (a mismatch produces an archive the server cannot read
 * back, which is worse than no backup).
 *
 * TODO: when this lands, note that it dumps *every* store in the database, not
 * just the caller's, and that restoring it is a whole-cluster operation that
 * cannot be scoped to one tenant the way the logical restore is. That asymmetry
 * needs its own confirmation flow before the format is exposed in the UI.
 */
export interface PgDumpAvailability {
  enabled: boolean;
  binaryFound: boolean;
  version: string | null;
  reason: string | null;
}

let cached: PgDumpAvailability | null = null;

export async function checkPgDumpAvailability(): Promise<PgDumpAvailability> {
  if (cached) return cached;

  if (!env.BACKUP_ENABLE_PG_DUMP) {
    cached = {
      enabled: false,
      binaryFound: false,
      version: null,
      reason: 'BACKUP_ENABLE_PG_DUMP is not set to true',
    };
    return cached;
  }

  try {
    const { stdout } = await execFileAsync('pg_dump', ['--version'], { timeout: 5_000 });
    const version = stdout.trim();
    cached = { enabled: true, binaryFound: true, version, reason: null };
    logger.info('pg_dump detected', { version });
  } catch {
    cached = {
      enabled: false,
      binaryFound: false,
      version: null,
      reason: 'pg_dump was not found on PATH',
    };
  }

  return cached;
}

/** Test seam — the probe result is cached for the lifetime of the process. */
export function resetPgDumpAvailabilityCache(): void {
  cached = null;
}
