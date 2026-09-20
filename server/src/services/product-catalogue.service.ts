import {
  AuditEntityType,
  AuditEventType,
  ProductStatus,
  UserRole,
  type CreateProductCategoryRequest,
  type CreateProductRequest,
  type ProductCategoryItem,
  type ProductDetail,
  type ProductListItem,
  type ProductListQuery,
  type ProductListResponse,
  type UpdateProductCategoryRequest,
  type UpdateProductRequest,
} from '@furniture-erp/shared';

import { getStorageDriver } from '../lib/storage/index.js';
import {
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MIME_TYPES,
} from '../lib/storage/types.js';
import * as catalogueRepository from '../repositories/product-catalogue.repository.js';
import { ApiError } from '../utils/api-error.js';
import { recordAudit } from './audit.service.js';
import { assertCanCreateResource, assertCanUseFeature } from './entitlement.service.js';
import { FeatureKey, LimitResourceKey } from '@furniture-erp/shared';

const CATALOGUE_MANAGERS: ReadonlySet<string> = new Set([
  UserRole.ADMIN,
  UserRole.PLATFORM_ADMIN,
]);

export function canManageCatalogue(role: string): boolean {
  return CATALOGUE_MANAGERS.has(role);
}

export function assertCanManageCatalogue(role: string): void {
  if (!canManageCatalogue(role)) {
    throw ApiError.forbidden('Only store administrators can manage the product catalogue');
  }
}

export function assertCanViewCatalogue(role: string): void {
  assertCanManageCatalogue(role);
}

function mapUniqueViolation(error: unknown, field: 'sku' | 'name'): never {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  ) {
    if (field === 'sku') {
      throw ApiError.validation('A product with this SKU already exists in this store', [
        { field: 'sku', message: 'SKU must be unique within the store' },
      ]);
    }
    throw ApiError.validation('A category with this name already exists', [
      { field: 'name', message: 'Category name must be unique within the store' },
    ]);
  }
  throw error;
}

async function assertActiveCategoryInStore(
  storeId: string,
  categoryId: string | null | undefined,
  required: boolean,
): Promise<void> {
  if (!categoryId) {
    if (required) {
      throw ApiError.validation('Category is required', [
        { field: 'categoryId', message: 'Category is required' },
      ]);
    }
    return;
  }
  const category = await catalogueRepository.findCategoryInStore(storeId, categoryId);
  if (!category) {
    throw ApiError.validation('Category not found in this store', [
      { field: 'categoryId', message: 'Category not found in this store' },
    ]);
  }
  if (!category.isActive) {
    throw ApiError.validation('Category is inactive', [
      { field: 'categoryId', message: 'Category is inactive' },
    ]);
  }
}

export async function listProducts(
  storeId: string,
  actorRole: string,
  query: ProductListQuery = {},
): Promise<ProductListResponse> {
  assertCanViewCatalogue(actorRole);
  return catalogueRepository.listCatalogueProducts(storeId, query);
}

export async function getProduct(
  storeId: string,
  actorRole: string,
  productId: string,
): Promise<ProductDetail> {
  assertCanViewCatalogue(actorRole);
  const product = await catalogueRepository.getProductDetail(storeId, productId);
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

export async function createProduct(
  storeId: string,
  actorRole: string,
  input: CreateProductRequest,
  actorUserId?: string | null,
): Promise<ProductListItem> {
  assertCanManageCatalogue(actorRole);
  await assertCanUseFeature(storeId, FeatureKey.PRODUCTS);
  await assertCanCreateResource(storeId, LimitResourceKey.PRODUCTS);
  await assertActiveCategoryInStore(storeId, input.categoryId, true);
  try {
    const product = await catalogueRepository.createProduct(storeId, input);
    await recordAudit({
      storeId,
      actorUserId: actorUserId ?? null,
      eventType: AuditEventType.PRODUCT_CREATED,
      entityType: AuditEntityType.PRODUCT,
      entityId: product.id,
      summary: `Product created: ${product.name}`,
      metadata: { sku: product.sku },
    });
    void import('../modules/usage-analytics/try-track-activity.js')
      .then(({ tryTrackBusinessEvent }) =>
        tryTrackBusinessEvent({
          actorUserId: actorUserId ?? null,
          storeId,
          eventType: 'product_created',
          entityId: product.id,
          feature: 'products',
        }),
      )
      .catch(() => undefined);
    return product;
  } catch (error) {
    return mapUniqueViolation(error, 'sku');
  }
}

export async function updateProduct(
  storeId: string,
  actorRole: string,
  productId: string,
  input: UpdateProductRequest,
  actorUserId?: string | null,
): Promise<ProductListItem> {
  assertCanManageCatalogue(actorRole);
  await assertActiveCategoryInStore(storeId, input.categoryId, false);

  try {
    const updated = await catalogueRepository.updateProduct(storeId, productId, input);
    if (!updated) throw ApiError.notFound('Product not found');
    await recordAudit({
      storeId,
      actorUserId: actorUserId ?? null,
      eventType: AuditEventType.PRODUCT_UPDATED,
      entityType: AuditEntityType.PRODUCT,
      entityId: updated.id,
      summary: `Product updated: ${updated.name}`,
    });
    return updated;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return mapUniqueViolation(error, 'sku');
  }
}

export async function archiveProduct(
  storeId: string,
  actorRole: string,
  productId: string,
  actorUserId?: string | null,
): Promise<ProductListItem> {
  assertCanManageCatalogue(actorRole);
  const updated = await catalogueRepository.updateProduct(storeId, productId, {
    status: ProductStatus.ARCHIVED,
  });
  if (!updated) throw ApiError.notFound('Product not found');
  await recordAudit({
    storeId,
    actorUserId: actorUserId ?? null,
    eventType: AuditEventType.PRODUCT_ARCHIVED,
    entityType: AuditEntityType.PRODUCT,
    entityId: updated.id,
    summary: `Product archived: ${updated.name}`,
  });
  return updated;
}

export async function restoreProduct(
  storeId: string,
  actorRole: string,
  productId: string,
  actorUserId?: string | null,
): Promise<ProductListItem> {
  assertCanManageCatalogue(actorRole);
  const updated = await catalogueRepository.updateProduct(storeId, productId, {
    status: ProductStatus.ACTIVE,
  });
  if (!updated) throw ApiError.notFound('Product not found');
  await recordAudit({
    storeId,
    actorUserId: actorUserId ?? null,
    eventType: AuditEventType.PRODUCT_RESTORED,
    entityType: AuditEntityType.PRODUCT,
    entityId: updated.id,
    summary: `Product restored: ${updated.name}`,
  });
  return updated;
}

/**
 * Hard-delete an archived product. Sale history keeps name snapshots;
 * purchase history still referencing the product blocks deletion.
 */
export async function deleteProduct(
  storeId: string,
  actorRole: string,
  productId: string,
  actorUserId?: string | null,
): Promise<void> {
  assertCanManageCatalogue(actorRole);

  const existing = await catalogueRepository.findProductInStore(storeId, productId);
  if (!existing) throw ApiError.notFound('Product not found');

  if (existing.status !== ProductStatus.ARCHIVED) {
    throw ApiError.conflict('Faqat arxivlangan mebelni butunlay o‘chirish mumkin. Avval arxivlang.');
  }

  const purchaseCount = await catalogueRepository.countProductPurchaseItems(storeId, productId);
  if (purchaseCount > 0) {
    throw ApiError.conflict(
      'Bu mebel yetkazib berish (kirim) hujjatlarida ishlatilgan — butunlay o‘chirib bo‘lmaydi.',
    );
  }

  const deleted = await catalogueRepository.deleteProductPermanent(storeId, productId);
  if (!deleted) throw ApiError.notFound('Product not found');

  if (deleted.imageKey) {
    try {
      const storage = getStorageDriver();
      await storage.delete(deleted.imageKey);
    } catch {
      // Image cleanup is best-effort; the catalogue row is already gone.
    }
  }

  await recordAudit({
    storeId,
    actorUserId: actorUserId ?? null,
    eventType: AuditEventType.PRODUCT_DELETED,
    entityType: AuditEntityType.PRODUCT,
    entityId: deleted.id,
    summary: `Product permanently deleted: ${deleted.name}`,
  });
}

export async function uploadProductImage(
  storeId: string,
  actorRole: string,
  productId: string,
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  actorUserId?: string | null,
): Promise<ProductListItem> {
  assertCanManageCatalogue(actorRole);

  if (!PRODUCT_IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw ApiError.validation('Unsupported image type', [
      { field: 'image', message: 'Use JPEG, PNG, WebP, or GIF' },
    ]);
  }
  if (file.size <= 0 || file.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw ApiError.validation('Image is too large', [
      { field: 'image', message: 'Image must be at most 2 MB' },
    ]);
  }

  const existing = await catalogueRepository.findProductInStore(storeId, productId);
  if (!existing) throw ApiError.notFound('Product not found');

  const storage = getStorageDriver();
  const previousKey = existing.imageKey;
  const uploaded = await storage.upload({
    folder: `stores/${storeId}/products`,
    filename: file.originalname || 'product.jpg',
    buffer: file.buffer,
    contentType: file.mimetype,
  });

  const updated = await catalogueRepository.setProductImage(storeId, productId, {
    key: uploaded.key,
    url: uploaded.url,
  });
  if (!updated) throw ApiError.notFound('Product not found');

  if (previousKey && previousKey !== uploaded.key) {
    await storage.delete(previousKey).catch(() => undefined);
  }

  await recordAudit({
    storeId,
    actorUserId: actorUserId ?? null,
    eventType: AuditEventType.PRODUCT_IMAGE_CHANGED,
    entityType: AuditEntityType.PRODUCT,
    entityId: updated.id,
    summary: `Product image uploaded: ${updated.name}`,
    metadata: { action: 'upload' },
  });

  return updated;
}

export async function removeProductImage(
  storeId: string,
  actorRole: string,
  productId: string,
  actorUserId?: string | null,
): Promise<ProductListItem> {
  assertCanManageCatalogue(actorRole);
  const existing = await catalogueRepository.findProductInStore(storeId, productId);
  if (!existing) throw ApiError.notFound('Product not found');

  const updated = await catalogueRepository.setProductImage(storeId, productId, null);
  if (!updated) throw ApiError.notFound('Product not found');

  if (existing.imageKey) {
    await getStorageDriver().delete(existing.imageKey).catch(() => undefined);
  }

  await recordAudit({
    storeId,
    actorUserId: actorUserId ?? null,
    eventType: AuditEventType.PRODUCT_IMAGE_CHANGED,
    entityType: AuditEntityType.PRODUCT,
    entityId: updated.id,
    summary: `Product image removed: ${updated.name}`,
    metadata: { action: 'remove' },
  });

  return updated;
}

export async function listCategories(
  storeId: string,
  actorRole: string,
  options?: { includeInactive?: boolean },
): Promise<ProductCategoryItem[]> {
  assertCanViewCatalogue(actorRole);
  return catalogueRepository.listProductCategories(storeId, options);
}

export async function createCategory(
  storeId: string,
  actorRole: string,
  input: CreateProductCategoryRequest,
): Promise<ProductCategoryItem> {
  assertCanManageCatalogue(actorRole);
  try {
    return await catalogueRepository.createProductCategory(storeId, input);
  } catch (error) {
    return mapUniqueViolation(error, 'name');
  }
}

export async function updateCategory(
  storeId: string,
  actorRole: string,
  categoryId: string,
  input: UpdateProductCategoryRequest,
): Promise<ProductCategoryItem> {
  assertCanManageCatalogue(actorRole);
  try {
    const updated = await catalogueRepository.updateProductCategory(
      storeId,
      categoryId,
      input,
    );
    if (!updated) throw ApiError.notFound('Category not found');
    return updated;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return mapUniqueViolation(error, 'name');
  }
}

export async function deactivateCategory(
  storeId: string,
  actorRole: string,
  categoryId: string,
): Promise<ProductCategoryItem> {
  assertCanManageCatalogue(actorRole);
  const updated = await catalogueRepository.deactivateProductCategory(storeId, categoryId);
  if (!updated) throw ApiError.notFound('Category not found');
  return updated;
}
