import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../../config/env.js';
import type { StorageDriver, StoredObject, UploadObjectInput } from './types.js';

function extensionFor(contentType: string, filename: string): string {
  const fromName = path.extname(filename).toLowerCase();
  if (fromName && fromName.length <= 8) return fromName;
  if (contentType === 'image/png') return '.png';
  if (contentType === 'image/webp') return '.webp';
  if (contentType === 'image/gif') return '.gif';
  return '.jpg';
}

/**
 * Local disk driver — fine for development and single-node VPS.
 * Not durable on serverless (Vercel/lambda) ephemeral filesystems.
 */
export function createLocalStorageDriver(): StorageDriver {
  const root = path.isAbsolute(env.STORAGE_LOCAL_DIR)
    ? env.STORAGE_LOCAL_DIR
    : path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR);
  const publicBase = env.STORAGE_PUBLIC_URL.replace(/\/$/, '');

  return {
    name: 'local',

    async upload(input: UploadObjectInput): Promise<StoredObject> {
      const ext = extensionFor(input.contentType, input.filename);
      const hash = createHash('sha256').update(input.buffer).digest('hex').slice(0, 12);
      const key = `${input.folder}/${randomUUID()}-${hash}${ext}`;
      const absolute = path.join(root, key);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, input.buffer);
      return {
        key,
        url: `${publicBase}/${key.replace(/\\/g, '/')}`,
        contentType: input.contentType,
        bytes: input.buffer.byteLength,
      };
    },

    async delete(key: string): Promise<void> {
      const absolute = path.join(root, key);
      try {
        await unlink(absolute);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    },
  };
}
