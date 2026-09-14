import { ApiError } from '../utils/api-error.js';
import { getStorageDriver } from '../lib/storage/index.js';
import { PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGE_MIME_TYPES } from '../lib/storage/types.js';
import type { BillingProofDto } from '@furniture-erp/shared';

export async function uploadBillingProof(
  folder: string,
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
): Promise<BillingProofDto> {
  if (!PRODUCT_IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw ApiError.validation("Chek formati noto'g'ri", [
      { field: 'image', message: 'JPEG, PNG, WebP yoki GIF yuklang' },
    ]);
  }
  if (file.size <= 0 || file.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw ApiError.validation("Chek hajmi katta", [
      { field: 'image', message: "Rasm 2 MB dan oshmasin" },
    ]);
  }

  const uploaded = await getStorageDriver().upload({
    folder,
    filename: file.originalname || 'proof.jpg',
    buffer: file.buffer,
    contentType: file.mimetype,
  });

  return { url: uploaded.url, key: uploaded.key };
}
