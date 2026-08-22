import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { env } from '../../config/env.js';
import { ApiError } from '../../utils/api-error.js';
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
 * Cloudinary signed upload via REST.
 * Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
 */
export function createCloudinaryStorageDriver(): StorageDriver {
  const cloud = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (!cloud || !apiKey || !apiSecret) {
    throw ApiError.internal(
      'Cloudinary storage is selected but CLOUDINARY_* credentials are missing',
    );
  }

  return {
    name: 'cloudinary',

    async upload(input: UploadObjectInput): Promise<StoredObject> {
      const ext = extensionFor(input.contentType, input.filename);
      const publicId = `${input.folder}/${randomUUID()}`;
      const timestamp = String(Math.floor(Date.now() / 1000));
      const toSign = `folder=${input.folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = createHash('sha1').update(toSign).digest('hex');

      const form = new FormData();
      const bytes = new Uint8Array(input.buffer);
      form.append('file', new Blob([bytes], { type: input.contentType }), `upload${ext}`);
      form.append('api_key', apiKey);
      form.append('timestamp', timestamp);
      form.append('public_id', publicId);
      form.append('folder', input.folder);
      form.append('signature', signature);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
        method: 'POST',
        body: form,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw ApiError.internal(`Cloudinary upload failed (${response.status}): ${text}`);
      }
      const payload = (await response.json()) as {
        public_id: string;
        secure_url: string;
        bytes: number;
      };

      return {
        key: payload.public_id,
        url: payload.secure_url,
        contentType: input.contentType,
        bytes: payload.bytes,
      };
    },

    async delete(key: string): Promise<void> {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const toSign = `public_id=${key}&timestamp=${timestamp}${apiSecret}`;
      const signature = createHash('sha1').update(toSign).digest('hex');

      const form = new FormData();
      form.append('public_id', key);
      form.append('api_key', apiKey);
      form.append('timestamp', timestamp);
      form.append('signature', signature);

      await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, {
        method: 'POST',
        body: form,
      }).catch(() => undefined);
    },
  };
}
