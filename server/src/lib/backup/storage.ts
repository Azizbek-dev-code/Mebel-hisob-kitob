import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGzip, gunzipSync } from 'node:zlib';

import { env } from '../../config/env.js';

/** Gzip member header, used to tell a compressed upload from a bare .json one. */
const GZIP_MAGIC = [0x1f, 0x8b];

export interface WrittenArtefact {
  sizeBytes: number;
  checksumSha256: string;
}

function backupRoot(): string {
  return path.isAbsolute(env.BACKUP_DIR)
    ? env.BACKUP_DIR
    : path.resolve(process.cwd(), env.BACKUP_DIR);
}

/**
 * Store and backup ids are cuids, so a path segment can only ever be made of
 * these characters. Anything else is rejected rather than sanitised.
 */
const SAFE_PATH_SEGMENT = /^[A-Za-z0-9_-]+$/;

/**
 * Absolute path of one backup artefact.
 *
 * Both ids come out of the database, but this is the last gate before a
 * filesystem call, so neither is trusted. A segment that is not a bare
 * identifier is rejected outright rather than stripped down to a safe one:
 * `path.basename('../../etc/passwd')` would quietly become `passwd` and write
 * a real file, hiding the fact that something upstream passed an attacker's
 * string. The resolved path is then re-checked against the backup root, so a
 * misconfigured `BACKUP_DIR` cannot widen the blast radius either.
 */
export function resolveBackupPath(storeId: string, backupId: string): string {
  if (!SAFE_PATH_SEGMENT.test(storeId) || !SAFE_PATH_SEGMENT.test(backupId)) {
    throw new Error('Invalid backup path segment');
  }

  const root = path.resolve(backupRoot());
  const resolved = path.resolve(root, storeId, `${backupId}.json.gz`);
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Resolved backup path escapes the backup directory');
  }
  return resolved;
}

/**
 * Gzips `json` to the artefact path, hashing the compressed bytes on the way
 * through so the checksum never requires a second read.
 *
 * Written to a `.part` file and renamed on success: a crash mid-write leaves
 * debris rather than a truncated archive that looks complete.
 */
export async function writeBackupArtefact(
  storeId: string,
  backupId: string,
  json: string,
): Promise<WrittenArtefact> {
  const target = resolveBackupPath(storeId, backupId);
  const temp = `${target}.part`;

  await fs.mkdir(path.dirname(target), { recursive: true });

  const hash = createHash('sha256');
  let sizeBytes = 0;

  const gzip = createGzip();
  gzip.on('data', (chunk: Buffer) => {
    hash.update(chunk);
    sizeBytes += chunk.length;
  });

  try {
    await pipeline(Readable.from([json]), gzip, createWriteStream(temp));
    await fs.rename(temp, target);
  } catch (error) {
    await fs.rm(temp, { force: true }).catch(() => undefined);
    throw error;
  }

  return { sizeBytes, checksumSha256: hash.digest('hex') };
}

export async function backupArtefactExists(storeId: string, backupId: string): Promise<boolean> {
  try {
    const stat = await fs.stat(resolveBackupPath(storeId, backupId));
    return stat.isFile();
  } catch {
    return false;
  }
}

export function openBackupArtefact(storeId: string, backupId: string): NodeJS.ReadableStream {
  return createReadStream(resolveBackupPath(storeId, backupId));
}

export async function deleteBackupArtefact(storeId: string, backupId: string): Promise<void> {
  await fs.rm(resolveBackupPath(storeId, backupId), { force: true }).catch(() => undefined);
}

/** Thrown when an upload expands past {@link maxDecompressedBytes}. */
export class BackupTooLargeError extends Error {
  constructor(limitBytes: number) {
    super(`Backup expands to more than ${limitBytes} bytes`);
    this.name = 'BackupTooLargeError';
  }
}

/**
 * Ceiling on the decompressed size of an upload.
 *
 * The multer limit bounds the bytes on the wire, but gzip routinely reaches
 * 1000:1 on repetitive text, so a 50 MB upload that passes that check can still
 * expand to tens of gigabytes and take the process down. Ten times the upload
 * limit is generous for real data — JSON of this shape compresses closer to
 * 10:1 — while keeping the worst case survivable.
 */
export function maxDecompressedBytes(): number {
  return env.BACKUP_MAX_UPLOAD_BYTES * 10;
}

/**
 * Returns the JSON text of an uploaded backup.
 *
 * Accepts both the gzipped archive this system produces and a plain `.json`
 * file, because administrators do decompress archives to look inside them.
 */
export function readUploadedDocument(buffer: Buffer): string {
  const limit = maxDecompressedBytes();
  const isGzip =
    buffer.length >= 2 && buffer[0] === GZIP_MAGIC[0] && buffer[1] === GZIP_MAGIC[1];

  if (!isGzip) {
    if (buffer.length > limit) throw new BackupTooLargeError(limit);
    return buffer.toString('utf8');
  }

  try {
    return gunzipSync(buffer, { maxOutputLength: limit }).toString('utf8');
  } catch (error) {
    // zlib reports the cap as a buffer-size error; everything else is a
    // genuinely corrupt archive and should keep its own message.
    if (error instanceof RangeError || (error as NodeJS.ErrnoException)?.code === 'ERR_BUFFER_TOO_LARGE') {
      throw new BackupTooLargeError(limit);
    }
    throw error;
  }
}

/** Download name shown to the administrator; never used as a server path. */
export function buildBackupFilename(createdAt: Date): string {
  const stamp = createdAt.toISOString().replace(/[:.]/g, '-');
  return `furniture-erp-backup-${stamp}.json.gz`;
}
