import { put, del } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

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
 * Vercel Blob storage driver for product images.
 * Requires BLOB_READ_WRITE_TOKEN env var.
 */
export function createVercelBlobStorageDriver(): StorageDriver {
  return {
    name: 'vercel-blob',

    async upload(input: UploadObjectInput): Promise<StoredObject> {
      const ext = extensionFor(input.contentType, input.filename);
      const pathname = `${input.folder}/${randomUUID()}${ext}`;

      const blob = await put(pathname, input.buffer, {
        access: 'public',
        contentType: input.contentType,
        addRandomSuffix: false,
      });

      return {
        key: blob.pathname,
        url: blob.url,
        contentType: input.contentType,
        bytes: input.buffer.byteLength,
      };
    },

    async delete(key: string): Promise<void> {
      await del(key);
    },
  };
}
