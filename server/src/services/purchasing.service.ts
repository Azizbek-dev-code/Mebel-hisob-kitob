import {
  AuditEntityType,
  AuditEventType,
  PurchasePaymentStatus,
  PurchaseStatus,
  StockMovementType,
  StockReferenceType,
  SupplierStatus,
  UserRole,
  isNormalizedUzMobile,
  normalizeUzPhone,
  type CancelPurchaseRequest,
  type CreatePurchaseRequest,
  type CreateSupplierPaymentRequest,
  type CreateSupplierRequest,
  type PurchaseDetail,
  type PurchaseListQuery,
  type PurchaseListResponse,
  type PurchasePaymentItem,
  type SupplierDetail,
  type SupplierListItem,
  type SupplierListQuery,
  type SupplierListResponse,
  type UpdateSupplierRequest,
} from '@furniture-erp/shared';

import { parseFlexibleDate } from '../lib/date-input.js';
import { fromDbMoney } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';
import * as inventoryRepository from '../repositories/inventory.repository.js';
import * as purchasingRepository from '../repositories/purchasing.repository.js';
import { ApiError } from '../utils/api-error.js';
import { recordAudit } from './audit.service.js';
import { assertCanCreateResource, assertCanUseFeature } from './entitlement.service.js';
import { FeatureKey, LimitResourceKey } from '@furniture-erp/shared';

const PURCHASING_MANAGERS: ReadonlySet<string> = new Set([
  UserRole.ADMIN,
  UserRole.PLATFORM_ADMIN,
]);

export function canManagePurchasing(role: string): boolean {
  return PURCHASING_MANAGERS.has(role);
}

export function assertCanManagePurchasing(role: string): void {
  if (!canManagePurchasing(role)) {
    throw ApiError.forbidden('Only store administrators can manage supplier purchases');
  }
}

export function paymentStatusFromAmounts(
  paid: number,
  total: number,
): PurchasePaymentStatus {
  if (paid <= 0) return PurchasePaymentStatus.UNPAID;
  if (total - paid <= 0) return PurchasePaymentStatus.PAID;
  return PurchasePaymentStatus.PARTIALLY_PAID;
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

function normalizeOptionalPhone(phone: string | null | undefined): string | null {
  if (phone === undefined || phone === null) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  const normalised = normalizeUzPhone(trimmed);
  if (!isNormalizedUzMobile(normalised)) {
    throw ApiError.validation('Phone number looks invalid', [
      { field: 'phone', message: 'Use a Uzbekistan mobile number (+998 XX XXX XX XX)' },
    ]);
  }
  return normalised;
}

export async function listSuppliers(
  storeId: string,
  actorRole: string,
  query: SupplierListQuery = {},
): Promise<SupplierListResponse> {
  assertCanManagePurchasing(actorRole);
  return purchasingRepository.listSuppliers(storeId, query);
}

export async function getSupplier(
  storeId: string,
  actorRole: string,
  supplierId: string,
): Promise<SupplierDetail> {
  assertCanManagePurchasing(actorRole);
  const supplier = await purchasingRepository.getSupplierDetail(storeId, supplierId);
  if (!supplier) throw ApiError.notFound('Supplier not found');
  return supplier;
}

export async function createSupplier(
  storeId: string,
  actorRole: string,
  input: CreateSupplierRequest,
  actorUserId?: string | null,
): Promise<SupplierListItem> {
  assertCanManagePurchasing(actorRole);
  await assertCanUseFeature(storeId, FeatureKey.SUPPLIERS);
  await assertCanCreateResource(storeId, LimitResourceKey.SUPPLIERS);
  const name = input.name.trim();
  if (!name) {
    throw ApiError.validation('Name is required', [
      { field: 'name', message: 'Name is required' },
    ]);
  }

  const supplier = await purchasingRepository.createSupplier(storeId, {
    name,
    phone: normalizeOptionalPhone(input.phone),
    notes: input.notes?.trim() ? input.notes.trim() : null,
  });

  await recordAudit({
    storeId,
    actorUserId: actorUserId ?? null,
    eventType: AuditEventType.SUPPLIER_CREATED,
    entityType: AuditEntityType.SUPPLIER,
    entityId: supplier.id,
    summary: `Supplier created: ${supplier.name}`,
  });

  return supplier;
}

export async function updateSupplier(
  storeId: string,
  actorRole: string,
  supplierId: string,
  input: UpdateSupplierRequest,
  actorUserId?: string | null,
): Promise<SupplierListItem> {
  assertCanManagePurchasing(actorRole);

  const payload: { name?: string; phone?: string | null; notes?: string | null } = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw ApiError.validation('Name is required', [
        { field: 'name', message: 'Name is required' },
      ]);
    }
    payload.name = name;
  }
  if (input.phone !== undefined) {
    payload.phone = normalizeOptionalPhone(input.phone);
  }
  if (input.notes !== undefined) {
    payload.notes = input.notes?.trim() ? input.notes.trim() : null;
  }

  const updated = await purchasingRepository.updateSupplier(storeId, supplierId, payload);
  if (!updated) throw ApiError.notFound('Supplier not found');

  await recordAudit({
    storeId,
    actorUserId: actorUserId ?? null,
    eventType: AuditEventType.SUPPLIER_UPDATED,
    entityType: AuditEntityType.SUPPLIER,
    entityId: updated.id,
    summary: `Supplier updated: ${updated.name}`,
  });

  return updated;
}

export async function archiveSupplier(
  storeId: string,
  actorRole: string,
  supplierId: string,
  actorUserId?: string | null,
): Promise<SupplierListItem> {
  assertCanManagePurchasing(actorRole);
  const updated = await purchasingRepository.setSupplierStatus(
    storeId,
    supplierId,
    SupplierStatus.ARCHIVED,
  );
  if (!updated) throw ApiError.notFound('Supplier not found');

  await recordAudit({
    storeId,
    actorUserId: actorUserId ?? null,
    eventType: AuditEventType.SUPPLIER_ARCHIVED,
    entityType: AuditEntityType.SUPPLIER,
    entityId: updated.id,
    summary: `Supplier archived: ${updated.name}`,
  });

  return updated;
}

export async function restoreSupplier(
  storeId: string,
  actorRole: string,
  supplierId: string,
  actorUserId?: string | null,
): Promise<SupplierListItem> {
  assertCanManagePurchasing(actorRole);
  const updated = await purchasingRepository.setSupplierStatus(
    storeId,
    supplierId,
    SupplierStatus.ACTIVE,
  );
  if (!updated) throw ApiError.notFound('Supplier not found');

  await recordAudit({
    storeId,
    actorUserId: actorUserId ?? null,
    eventType: AuditEventType.SUPPLIER_RESTORED,
    entityType: AuditEntityType.SUPPLIER,
    entityId: updated.id,
    summary: `Supplier restored: ${updated.name}`,
  });

  return updated;
}

export async function listPurchases(
  storeId: string,
  actorRole: string,
  query: PurchaseListQuery = {},
): Promise<PurchaseListResponse> {
  assertCanManagePurchasing(actorRole);
  return purchasingRepository.listPurchases(storeId, query);
}

export async function getPurchase(
  storeId: string,
  actorRole: string,
  purchaseId: string,
): Promise<PurchaseDetail> {
  assertCanManagePurchasing(actorRole);
  const purchase = await purchasingRepository.getPurchaseDetail(storeId, purchaseId);
  if (!purchase) throw ApiError.notFound('Purchase not found');
  return purchase;
}

export async function createPurchase(
  storeId: string,
  actor: { id: string; role: string },
  input: CreatePurchaseRequest,
): Promise<PurchaseDetail> {
  assertCanManagePurchasing(actor.role);

  if (!input.items?.length) {
    throw ApiError.validation('Add at least one product', [
      { field: 'items', message: 'Add at least one product' },
    ]);
  }

  const supplier = await purchasingRepository.findSupplierInStore(storeId, input.supplierId);
  if (!supplier) {
    throw ApiError.validation('Supplier not found in this store', [
      { field: 'supplierId', message: 'Supplier not found in this store' },
    ]);
  }
  if (supplier.status !== SupplierStatus.ACTIVE) {
    throw ApiError.validation('Supplier is archived', [
      { field: 'supplierId', message: 'Supplier is archived' },
    ]);
  }

  const productIds = input.items.map((item) => item.productId);
  const uniqueIds = [...new Set(productIds)];
  if (uniqueIds.length !== productIds.length) {
    throw ApiError.validation('Duplicate products in purchase lines', [
      { field: 'items', message: 'Each product may appear only once per purchase' },
    ]);
  }

  const products = await prisma.product.findMany({
    where: { storeId, id: { in: uniqueIds } },
    select: { id: true, name: true, trackStock: true, minStockQty: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const lines: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    lineTotal: number;
    trackStock: boolean;
    minStockQty: number;
  }> = [];

  let totalCost = 0;
  for (let i = 0; i < input.items.length; i += 1) {
    const item = input.items[i]!;
    const product = productMap.get(item.productId);
    if (!product) {
      throw ApiError.validation('Product not found in this store', [
        { field: `items.${i}.productId`, message: 'Product not found in this store' },
      ]);
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw ApiError.validation('Quantity must be a positive integer', [
        { field: `items.${i}.quantity`, message: 'Quantity must be at least 1' },
      ]);
    }
    const unitCost = item.unitCost;
    const lineTotal = unitCost * item.quantity;
    totalCost += lineTotal;
    lines.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitCost,
      lineTotal,
      trackStock: product.trackStock,
      minStockQty: product.minStockQty,
    });
  }

  const paidAmount = input.paidAmount ?? 0;
  if (paidAmount > totalCost) {
    throw ApiError.validation('Paid amount cannot exceed total cost', [
      { field: 'paidAmount', message: 'Paid amount cannot exceed total cost' },
    ]);
  }
  if (paidAmount > 0 && !input.paymentMethod) {
    throw ApiError.validation('Payment method is required', [
      { field: 'paymentMethod', message: 'Payment method is required when paying' },
    ]);
  }

  const remainingAmount = totalCost - paidAmount;
  const paymentStatus = paymentStatusFromAmounts(paidAmount, totalCost);
  const purchaseDate = parseFlexibleDate(input.purchaseDate) ?? new Date();
  const notes = input.notes?.trim() ? input.notes.trim() : null;

  let purchaseId: string;
  try {
    purchaseId = await prisma.$transaction(async (tx) => {
      const purchaseNumber = await purchasingRepository.nextPurchaseNumber(tx, storeId);
      const created = await purchasingRepository.createPurchaseInTx(tx, {
        storeId,
        supplierId: supplier.id,
        purchaseNumber,
        purchaseDate,
        totalCost,
        paidAmount,
        remainingAmount,
        paymentStatus,
        notes,
        createdById: actor.id,
        items: lines.map((line) => ({
          productId: line.productId,
          productName: line.productName,
          quantity: line.quantity,
          unitCost: line.unitCost,
          lineTotal: line.lineTotal,
        })),
      });

      for (const line of lines) {
        if (!line.trackStock) {
          await tx.product.update({
            where: { id: line.productId },
            data: {
              trackStock: true,
              minStockQty: line.minStockQty > 0 ? line.minStockQty : 2,
            },
          });
        }

        await inventoryRepository.applyStockDelta(tx, {
          storeId,
          productId: line.productId,
          quantityDelta: line.quantity,
          movementType: StockMovementType.PURCHASE,
          referenceType: StockReferenceType.PURCHASE,
          referenceId: created.id,
          reason: `Purchase #${purchaseNumber}`,
          createdById: actor.id,
          productNameForError: line.productName,
        });
      }

      if (paidAmount > 0) {
        await purchasingRepository.addPaymentInTx(tx, {
          storeId,
          purchaseId: created.id,
          supplierId: supplier.id,
          amount: paidAmount,
          method: input.paymentMethod!,
          paidAt: purchaseDate,
          note: null,
          createdById: actor.id,
          paidAmount,
          remainingAmount,
          paymentStatus,
        });
      }

      return created.id;
    });
  } catch (error) {
    mapStockError(error);
  }

  const detail = await purchasingRepository.getPurchaseDetail(storeId, purchaseId);
  if (!detail) throw ApiError.internal('Purchase created but could not be loaded');

  await recordAudit({
    storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.PURCHASE_CREATED,
    entityType: AuditEntityType.PURCHASE,
    entityId: detail.id,
    summary: `Purchase #${detail.purchaseNumber} created`,
    metadata: {
      supplierId: detail.supplierId,
      totalCost: detail.totalCost,
      paidAmount: detail.paidAmount,
    },
  });

  return detail;
}

export async function addPayment(
  storeId: string,
  actor: { id: string; role: string },
  purchaseId: string,
  input: CreateSupplierPaymentRequest,
): Promise<{ payment: PurchasePaymentItem; purchase: PurchaseDetail }> {
  assertCanManagePurchasing(actor.role);

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw ApiError.validation('Amount must be greater than zero', [
      { field: 'amount', message: 'Amount must be greater than zero' },
    ]);
  }

  let paymentId: string;
  try {
    paymentId = await prisma.$transaction(async (tx) => {
      const purchase = await purchasingRepository.findPurchaseForUpdate(tx, storeId, purchaseId);
      if (!purchase) {
        throw ApiError.notFound('Purchase not found');
      }
      if (purchase.status === PurchaseStatus.CANCELLED) {
        throw ApiError.conflict('Cannot pay a cancelled purchase');
      }

      const remaining = fromDbMoney(purchase.remainingAmount);
      if (remaining <= 0) {
        throw ApiError.badRequest('Purchase is already fully paid');
      }
      if (input.amount > remaining) {
        throw ApiError.validation('Amount exceeds remaining balance', [
          { field: 'amount', message: `Remaining balance is ${remaining}` },
        ]);
      }

      const paidAmount = fromDbMoney(purchase.paidAmount) + input.amount;
      const totalCost = fromDbMoney(purchase.totalCost);
      const remainingAmount = totalCost - paidAmount;
      const paymentStatus = paymentStatusFromAmounts(paidAmount, totalCost);
      const paidAt = parseFlexibleDate(input.paidAt) ?? new Date();

      const created = await purchasingRepository.addPaymentInTx(tx, {
        storeId,
        purchaseId: purchase.id,
        supplierId: purchase.supplierId,
        amount: input.amount,
        method: input.method,
        paidAt,
        note: input.note?.trim() ? input.note.trim() : null,
        createdById: actor.id,
        paidAmount,
        remainingAmount,
        paymentStatus,
      });

      return created.paymentId;
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw error;
  }

  const purchase = await purchasingRepository.getPurchaseDetail(storeId, purchaseId);
  if (!purchase) throw ApiError.internal('Payment recorded but purchase could not be loaded');
  const payment = purchase.payments.find((p) => p.paymentId === paymentId);
  if (!payment) throw ApiError.internal('Payment recorded but could not be loaded');

  await recordAudit({
    storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.SUPPLIER_PAYMENT_CREATED,
    entityType: AuditEntityType.SUPPLIER_PAYMENT,
    entityId: payment.paymentId,
    summary: `Supplier payment recorded on purchase #${purchase.purchaseNumber}`,
    metadata: { purchaseId, amount: payment.amount, method: payment.method },
  });

  return { payment, purchase };
}

export async function cancelPurchase(
  storeId: string,
  actor: { id: string; role: string },
  purchaseId: string,
  input: CancelPurchaseRequest,
): Promise<PurchaseDetail> {
  assertCanManagePurchasing(actor.role);

  const reason = input.reason.trim();
  if (reason.length < 3) {
    throw ApiError.validation('Reason is required', [
      { field: 'reason', message: 'Provide a reason (at least 3 characters)' },
    ]);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const purchase = await purchasingRepository.findPurchaseForUpdate(tx, storeId, purchaseId);
      if (!purchase) {
        throw ApiError.notFound('Purchase not found');
      }
      if (purchase.status === PurchaseStatus.CANCELLED) {
        throw ApiError.conflict('Purchase is already cancelled');
      }

      for (const item of purchase.items) {
        await inventoryRepository.applyStockDelta(tx, {
          storeId,
          productId: item.productId,
          quantityDelta: -item.quantity,
          movementType: StockMovementType.MANUAL_OUT,
          referenceType: StockReferenceType.PURCHASE,
          referenceId: purchase.id,
          reason: `Purchase #${purchase.purchaseNumber} cancelled: ${reason}`,
          createdById: actor.id,
          productNameForError: item.productName,
        });
      }

      await purchasingRepository.cancelPurchaseInTx(tx, {
        purchaseId: purchase.id,
        cancelledById: actor.id,
        cancellationReason: reason,
        cancelledAt: new Date(),
      });
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    mapStockError(error);
  }

  const detail = await purchasingRepository.getPurchaseDetail(storeId, purchaseId);
  if (!detail) throw ApiError.internal('Purchase cancelled but could not be loaded');

  await recordAudit({
    storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.PURCHASE_CANCELLED,
    entityType: AuditEntityType.PURCHASE,
    entityId: detail.id,
    summary: `Purchase #${detail.purchaseNumber} cancelled`,
    metadata: { reason },
  });

  return detail;
}
