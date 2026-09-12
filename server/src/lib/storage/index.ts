import { env } from '../../config/env.js';
import { ApiError } from '../../utils/api-error.js';
import { createCloudinaryStorageDriver } from './cloudinary.driver.js';
import { createLocalStorageDriver } from './local.driver.js';
import { createVercelBlobStorageDriver } from './vercel-blob.driver.js';
import type { StorageDriver } from './types.js';

let cached: StorageDriver | null = null;

/**
 * Resolves the configured storage driver.
 *
 * Production note: set `STORAGE_DRIVER=cloudinary` (or implement supabase) before
 * deploying to serverless hosts — the local driver writes to disk and will not
 * survive ephemeral filesystems.
 */
export function getStorageDriver(): StorageDriver {
  if (cached) return cached;

  switch (env.STORAGE_DRIVER) {
    case 'local':
      cached = createLocalStorageDriver();
      break;
    case 'cloudinary':
      cached = createCloudinaryStorageDriver();
      break;
    case 'vercel-blob':
      cached = createVercelBlobStorageDriver();
      break;
    case 'supabase':
      throw ApiError.internal(
        'Supabase storage driver is not implemented yet. Use STORAGE_DRIVER=cloudinary or local.',
      );
    default:
      throw ApiError.internal(`Unknown STORAGE_DRIVER: ${env.STORAGE_DRIVER}`);
  }

  return cached;
}

/** Test helper — clears the singleton between cases. */
export function resetStorageDriverCache(): void {
  cached = null;
}
