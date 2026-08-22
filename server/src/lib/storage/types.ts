/**
 * File storage abstraction for product images.
 *
 * Drivers:
 * - `local` — development only; files under STORAGE_LOCAL_DIR, served at /uploads.
 *   Ephemeral on serverless — do not use as the sole production store.
 * - `cloudinary` — production-compatible when CLOUDINARY_* env vars are set.
 * - `supabase` — reserved; throws until configured (same contract as cloudinary).
 *
 * Product rows store `imageKey` (opaque storage key) and `imageUrl` (public URL).
 */

export interface StoredObject {
  key: string;
  url: string;
  contentType: string;
  bytes: number;
}

export interface UploadObjectInput {
  /** Logical folder, e.g. `products`. */
  folder: string;
  /** Original filename for extension hints only. */
  filename: string;
  buffer: Buffer;
  contentType: string;
}

export interface StorageDriver {
  readonly name: 'local' | 'cloudinary' | 'supabase';
  upload(input: UploadObjectInput): Promise<StoredObject>;
  delete(key: string): Promise<void>;
}

export const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2 MiB
export const PRODUCT_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
