import {
  AuditEntityType,
  AuditEventType,
  StockMovementType,
  StockReferenceType,
  UserRole,
  buildPaginationMeta,
  normalisePagination,
  type InventoryListQuery,
  type InventoryListResponse,
  type InventoryProductDetailResponse,
  type StockAdjustRequest,
  type StockHistoryQuery,
  type StockHistoryResponse,
  type StockInRequest,
  type StockMutationResponse,
  type StockOutRequest,
} from '@furniture-erp/shared';

import { prisma } from '../lib/prisma.js';
import * as inventoryRepository from '../repositories/inventory.repository.js';
import { ApiError } from '../utils/api-error.js';
import { recordAudit } from './audit.service.js';

const INVENTORY_MANAGERS: ReadonlySet<string> = new Set([
  UserRole.ADMIN,
  UserRole.PLATFORM_ADMIN,
]);

export function canManageInventory(role: string): boolean {
  return INVENTORY_MANAGERS.has(role);
}

export function assertCanManageInventory(role: string): void {
  if (!canManageInventory(role)) {
    throw ApiError.forbidden('Only store administrators can manage inventory');
  }
}

export function assertCanViewInventory(role: string): void {
  // Sellers see stock on the sale form via product lookup; inventory module is admin.
  assertCanManageInventory(role);
}

function mapStockError(error: unknown): never {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: string }).code;
    if (code === 'PRODUCT_NOT_FOUND') {
      throw ApiError.notFound('Product not found');
    }
    if (code === 'STOCK_NOT_TRACKED') {
      throw ApiError.badRequest('Stock tracking is disabled for this product');
    }
    if (code === 'INSUFFICIENT_STOCK') {
      const err = error as {
        productName?: string;
        available?: number;
        requested?: number;
      };
      throw ApiError.badRequest(
        `Insufficient stock for "${err.productName ?? 'product'}": available ${err.available ?? 0}, requested ${err.requested ?? 0}`,
        [
          {
            field: 'quantity',
            message: `Only ${err.available ?? 0} unit(s) available`,
          },
        ],
      );
    }
    if (code === 'ZERO_DELTA') {
      throw ApiError.validation('Quantity cannot be zero', [
        { field: 'quantity', message: 'Quantity cannot be zero' },
      ]);
    }
  }
  throw error;
}

function requireReason(reason: string | undefined, field = 'reason'): string {
  const trimmed = reason?.trim() ?? '';
  if (trimmed.length < 3) {
    throw ApiError.validation('Reason is required', [
      { field, message: 'Provide a reason (at least 3 characters)' },
    ]);
  }
  if (trimmed.length > 1000) {
    throw ApiError.validation('Reason is too long', [
      { field, message: 'Reason must be at most 1000 characters' },
    ]);
  }
  return trimmed;
}

export async function listInventory(
  storeId: string,
  actorRole: string,
  query: InventoryListQuery,
): Promise<InventoryListResponse> {
  assertCanViewInventory(actorRole);
  const { page, pageSize } = normalisePagination(query.page, query.pageSize);

  const [summary, listed] = await Promise.all([
    inventoryRepository.summarizeInventory(storeId),
    inventoryRepository.listInventoryProducts({
      storeId,
      search: query.search,
      stockFilter: query.stockFilter,
      page,
      pageSize,
    }),
  ]);

  return {
    summary,
    items: listed.items,
    meta: buildPaginationMeta(page, pageSize, listed.total),
  };
}

export async function getInventoryProduct(
  storeId: string,
  actorRole: string,
  productId: string,
): Promise<InventoryProductDetailResponse> {
  assertCanViewInventory(actorRole);
  const product = await inventoryRepository.findProductInStore(storeId, productId);
  if (!product) {
    throw ApiError.notFound('Product not found');
  }
  return {
    product: {
      ...inventoryRepository.toProductSummary(product),
      description: product.description,
      imageUrl: product.imageUrl,
      categoryName: product.category?.name ?? null,
    },
  };
}

export async function listStockHistory(
  storeId: string,
  actorRole: string,
  query: StockHistoryQuery,
): Promise<StockHistoryResponse> {
  assertCanViewInventory(actorRole);
  const { page, pageSize } = normalisePagination(query.page, query.pageSize);
  const listed = await inventoryRepository.listStockMovements({
    storeId,
    productId: query.productId,
    movementType: query.movementType,
    search: query.search,
    page,
    pageSize,
  });
  return {
    items: listed.items,
    meta: buildPaginationMeta(page, pageSize, listed.total),
  };
}

export async function stockIn(
  storeId: string,
  actor: { id: string; role: string },
  input: StockInRequest,
): Promise<StockMutationResponse> {
  assertCanManageInventory(actor.role);
  const reason = requireReason(input.reason);
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw ApiError.validation('Quantity must be a positive integer', [
      { field: 'quantity', message: 'Quantity must be at least 1' },
    ]);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let product = await inventoryRepository.findProductInStore(
        storeId,
        input.productId,
        tx,
      );
      if (!product) {
        throw Object.assign(new Error('PRODUCT_NOT_FOUND'), { code: 'PRODUCT_NOT_FOUND' });
      }
      if (!product.trackStock) {
        await tx.product.update({
          where: { id: product.id },
          data: { trackStock: true, minStockQty: product.minStockQty > 0 ? product.minStockQty : 2 },
        });
        product = { ...product, trackStock: true };
      }

      const { movement, stockQty } = await inventoryRepository.applyStockDelta(tx, {
        storeId,
        productId: product.id,
        quantityDelta: input.quantity,
        movementType: StockMovementType.PURCHASE,
        referenceType: StockReferenceType.PURCHASE,
        reason,
        createdById: actor.id,
      });

      return {
        product: inventoryRepository.toProductSummary({
          ...product,
          stockQty,
        }),
        movement,
      };
    });

    await recordAudit({
      storeId,
      actorUserId: actor.id,
      eventType: AuditEventType.STOCK_IN,
      entityType: AuditEntityType.STOCK,
      entityId: result.product.id,
      summary: `Stock in ${input.quantity} × ${result.product.name}`,
      metadata: { quantity: input.quantity, reason, movementId: result.movement.id },
    });

    return result;
  } catch (error) {
    mapStockError(error);
  }
}

export async function stockOut(
  storeId: string,
  actor: { id: string; role: string },
  input: StockOutRequest,
): Promise<StockMutationResponse> {
  assertCanManageInventory(actor.role);
  const reason = requireReason(input.reason);
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw ApiError.validation('Quantity must be a positive integer', [
      { field: 'quantity', message: 'Quantity must be at least 1' },
    ]);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await inventoryRepository.findProductInStore(
        storeId,
        input.productId,
        tx,
      );
      if (!product) {
        throw Object.assign(new Error('PRODUCT_NOT_FOUND'), { code: 'PRODUCT_NOT_FOUND' });
      }

      const { movement, stockQty } = await inventoryRepository.applyStockDelta(tx, {
        storeId,
        productId: product.id,
        quantityDelta: -input.quantity,
        movementType: StockMovementType.MANUAL_OUT,
        referenceType: StockReferenceType.MANUAL,
        reason,
        createdById: actor.id,
      });

      return {
        product: inventoryRepository.toProductSummary({
          ...product,
          stockQty,
        }),
        movement,
      };
    });

    await recordAudit({
      storeId,
      actorUserId: actor.id,
      eventType: AuditEventType.STOCK_OUT,
      entityType: AuditEntityType.STOCK,
      entityId: result.product.id,
      summary: `Stock out ${input.quantity} × ${result.product.name}`,
      metadata: { quantity: input.quantity, reason, movementId: result.movement.id },
    });

    return result;
  } catch (error) {
    mapStockError(error);
  }
}

export async function adjustStock(
  storeId: string,
  actor: { id: string; role: string },
  input: StockAdjustRequest,
): Promise<StockMutationResponse> {
  assertCanManageInventory(actor.role);
  const reason = requireReason(input.reason);
  if (!Number.isInteger(input.quantity) || input.quantity === 0) {
    throw ApiError.validation('Quantity must be a non-zero integer', [
      { field: 'quantity', message: 'Quantity cannot be zero' },
    ]);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await inventoryRepository.findProductInStore(
        storeId,
        input.productId,
        tx,
      );
      if (!product) {
        throw Object.assign(new Error('PRODUCT_NOT_FOUND'), { code: 'PRODUCT_NOT_FOUND' });
      }

      const { movement, stockQty } = await inventoryRepository.applyStockDelta(tx, {
        storeId,
        productId: product.id,
        quantityDelta: input.quantity,
        movementType: StockMovementType.ADJUSTMENT,
        referenceType: StockReferenceType.ADJUSTMENT,
        reason,
        createdById: actor.id,
      });

      return {
        product: inventoryRepository.toProductSummary({
          ...product,
          stockQty,
        }),
        movement,
      };
    });

    await recordAudit({
      storeId,
      actorUserId: actor.id,
      eventType: AuditEventType.STOCK_ADJUSTED,
      entityType: AuditEntityType.STOCK,
      entityId: result.product.id,
      summary: `Stock adjusted by ${input.quantity} × ${result.product.name}`,
      metadata: { quantity: input.quantity, reason, movementId: result.movement.id },
    });

    return result;
  } catch (error) {
    mapStockError(error);
  }
}

/**
 * Deduct stock for sale line items inside an existing transaction.
 * Skips products with trackStock=false. Fails the whole sale on insufficient stock.
 */
export async function deductStockForSale(
  tx: inventoryRepository.InventoryTxClient,
  options: {
    storeId: string;
    saleId: string;
    saleNumber: number;
    actorId: string;
    lines: Array<{ productId: string; productName: string; quantity: number; trackStock: boolean }>;
  },
): Promise<void> {
  for (const line of options.lines) {
    if (!line.trackStock) continue;
    try {
      await inventoryRepository.applyStockDelta(tx, {
        storeId: options.storeId,
        productId: line.productId,
        quantityDelta: -line.quantity,
        movementType: StockMovementType.SALE,
        referenceType: StockReferenceType.SALE,
        referenceId: options.saleId,
        reason: `Sale #${options.saleNumber}`,
        createdById: options.actorId,
        productNameForError: line.productName,
      });
    } catch (error) {
      mapStockError(error);
    }
  }
}

/**
 * Restore stock for a cancelled sale inside an existing transaction.
 * Skips lines without productId or with trackStock=false.
 */
export async function restoreStockForCancelledSale(
  tx: inventoryRepository.InventoryTxClient,
  options: {
    storeId: string;
    saleId: string;
    saleNumber: number;
    actorId: string;
    items: Array<{ productId: string | null; productName: string; quantity: number }>;
  },
): Promise<void> {
  for (const item of options.items) {
    if (!item.productId) continue;

    const product = await tx.product.findFirst({
      where: { id: item.productId, storeId: options.storeId },
      select: { id: true, trackStock: true, name: true },
    });
    if (!product || !product.trackStock) continue;

    try {
      await inventoryRepository.applyStockDelta(tx, {
        storeId: options.storeId,
        productId: product.id,
        quantityDelta: item.quantity,
        movementType: StockMovementType.SALE_CANCEL,
        referenceType: StockReferenceType.SALE,
        referenceId: options.saleId,
        reason: `Sale #${options.saleNumber} cancelled`,
        createdById: options.actorId,
        productNameForError: item.productName || product.name,
      });
    } catch (error) {
      mapStockError(error);
    }
  }
}
