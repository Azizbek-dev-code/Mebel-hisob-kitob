import path from 'node:path';
import { gzipSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

// Set before the module under test pulls in `config/env`, so the
// decompression ceiling is a few kilobytes rather than the 500 MB the
// production default works out to. Inflating half a gigabyte to prove the
// guard fires would make this file take minutes.
process.env.BACKUP_MAX_UPLOAD_BYTES = '4096';

const {
  BackupTooLargeError,
  buildBackupFilename,
  maxDecompressedBytes,
  readUploadedDocument,
  resolveBackupPath,
} = await import('./storage.js');

describe('resolveBackupPath', () => {
  it('places the artefact under BACKUP_DIR/<storeId>/<id>.json.gz', () => {
    const resolved = resolveBackupPath('store_1', 'backup_1');
    expect(resolved.endsWith(path.join('store_1', 'backup_1.json.gz'))).toBe(true);
  });

  it('refuses a traversal attempt in the backup id', () => {
    expect(() => resolveBackupPath('store_1', '../../../etc/passwd')).toThrow();
  });

  it('refuses a traversal attempt in the store id', () => {
    expect(() => resolveBackupPath('../..', 'backup_1')).toThrow();
  });

  it('refuses a directory prefix instead of quietly stripping it', () => {
    expect(() => resolveBackupPath('store_1', path.join('store_2', 'backup_1'))).toThrow();
  });

  it('refuses an absolute path', () => {
    expect(() => resolveBackupPath('store_1', 'C:\\Windows\\system32\\config')).toThrow();
    expect(() => resolveBackupPath('store_1', '/etc/passwd')).toThrow();
  });

  it('refuses a null byte', () => {
    expect(() => resolveBackupPath('store_1', 'backup_1\u0000.txt')).toThrow();
  });

  it('refuses empty segments', () => {
    expect(() => resolveBackupPath('', 'backup_1')).toThrow();
    expect(() => resolveBackupPath('store_1', '')).toThrow();
  });

  it('accepts the cuid shape real ids take', () => {
    expect(() => resolveBackupPath('ckv1234567890abcdefghijkl', 'ckv0987654321lkjihgfedcba')).not.toThrow();
  });
});

describe('readUploadedDocument', () => {
  it('decompresses a gzipped upload', () => {
    const json = '{"format":"furniture-erp-logical-v1"}';
    expect(readUploadedDocument(gzipSync(Buffer.from(json)))).toBe(json);
  });

  it('accepts a plain JSON upload', () => {
    const json = '{"format":"furniture-erp-logical-v1"}';
    expect(readUploadedDocument(Buffer.from(json))).toBe(json);
  });

  it('refuses an archive that expands past the ceiling', () => {
    // A few hundred bytes on the wire, far more than the limit once inflated:
    // the shape of a decompression-bomb upload, which the multer byte limit
    // alone would wave through.
    const bomb = gzipSync(Buffer.alloc(maxDecompressedBytes() + 1, 0x61));
    expect(bomb.length).toBeLessThan(maxDecompressedBytes());
    expect(() => readUploadedDocument(bomb)).toThrow(BackupTooLargeError);
  });

  it('refuses an oversized uncompressed upload', () => {
    const big = Buffer.alloc(maxDecompressedBytes() + 1, 0x61);
    expect(() => readUploadedDocument(big)).toThrow(BackupTooLargeError);
  });

  it('reports a corrupt archive separately from an oversized one', () => {
    // Gzip magic followed by rubbish: decompression fails outright.
    const corrupt = Buffer.concat([Buffer.from([0x1f, 0x8b]), Buffer.from('not really gzip')]);
    expect(() => readUploadedDocument(corrupt)).toThrow();
    expect(() => readUploadedDocument(corrupt)).not.toThrow(BackupTooLargeError);
  });
});

describe('buildBackupFilename', () => {
  it('produces a filename with no characters that need escaping', () => {
    const filename = buildBackupFilename(new Date('2026-08-20T09:15:30.123Z'));
    expect(filename).toBe('furniture-erp-backup-2026-08-20T09-15-30-123Z.json.gz');
    expect(filename).not.toMatch(/[:"/\\]/);
  });
});
