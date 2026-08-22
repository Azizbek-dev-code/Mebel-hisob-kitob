import {
  StockMovementType,
  UserRole,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => {
  const mock: Record<string, unknown> = {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    product: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      updateMany: vi.fn(),
    },
    stockMovement: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  };
  return { prismaMock: mock };
});

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

import * as inventoryService from './inventory.service.js';

const STORE_ID = 'store_1';
const OTHER_STORE = 'store_2';
const ADMIN_ID = 'user_admin';
const PRODUCT_ID = 'prod_1';

const PRODUCT = {
  id: PRODUCT_ID,
  storeId: STORE_ID,
  name: 'Spalni komplekt',
  sku: 'SP-15',
  description: null,
  imageUrl: null,
  stockQty: 5,
  minStockQty: 2,
  trackStock: true,
  category: { name: 'Spalni' },
};

describe('inventory.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prismaMock.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
    );
  });

  it('forbids sellers from managing inventory', async () => {
    await expect(
      inventoryService.stockIn(STORE_ID, { id: 'seller', role: UserRole.EMPLOYEE }, {
        productId: PRODUCT_ID,
        quantity: 1,
        reason: 'Delivery',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('stocks in and records PURCHASE movement', async () => {
    (prismaMock.product.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(PRODUCT);
    (prismaMock.product.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
    (prismaMock.stockMovement.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'mov_1',
      storeId: STORE_ID,
      productId: PRODUCT_ID,
      quantity: 5,
      quantityBefore: 5,
      quantityAfter: 10,
      movementType: StockMovementType.PURCHASE,
      referenceType: 'PURCHASE',
      referenceId: null,
      reason: 'Supplier delivery',
      createdById: ADMIN_ID,
      createdAt: new Date('2026-08-16T10:00:00.000Z'),
      product: { id: PRODUCT_ID, name: PRODUCT.name, sku: PRODUCT.sku },
      createdBy: { id: ADMIN_ID, fullName: 'Admin' },
    });

    const result = await inventoryService.stockIn(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      { productId: PRODUCT_ID, quantity: 5, reason: 'Supplier delivery' },
    );

    expect(result.product.stockQty).toBe(10);
    expect(result.movement.movementType).toBe(StockMovementType.PURCHASE);
    expect(result.movement.quantityBefore).toBe(5);
    expect(result.movement.quantityAfter).toBe(10);
    expect(prismaMock.product.updateMany).toHaveBeenCalled();
  });

  it('rejects stock out when insufficient', async () => {
    (prismaMock.product.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...PRODUCT,
      stockQty: 1,
    });

    await expect(
      inventoryService.stockOut(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, {
        productId: PRODUCT_ID,
        quantity: 3,
        reason: 'Damaged',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('requires a reason for adjustments', async () => {
    await expect(
      inventoryService.adjustStock(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, {
        productId: PRODUCT_ID,
        quantity: -1,
        reason: 'ab',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('applies negative adjustment', async () => {
    (prismaMock.product.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(PRODUCT);
    (prismaMock.product.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
    (prismaMock.stockMovement.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'mov_2',
      storeId: STORE_ID,
      productId: PRODUCT_ID,
      quantity: -1,
      quantityBefore: 5,
      quantityAfter: 4,
      movementType: StockMovementType.ADJUSTMENT,
      referenceType: 'ADJUSTMENT',
      referenceId: null,
      reason: 'Inventory count correction',
      createdById: ADMIN_ID,
      createdAt: new Date('2026-08-16T11:00:00.000Z'),
      product: { id: PRODUCT_ID, name: PRODUCT.name, sku: PRODUCT.sku },
      createdBy: { id: ADMIN_ID, fullName: 'Admin' },
    });

    const result = await inventoryService.adjustStock(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      { productId: PRODUCT_ID, quantity: -1, reason: 'Inventory count correction' },
    );

    expect(result.product.stockQty).toBe(4);
    expect(result.movement.quantity).toBe(-1);
  });

  it('returns 404 when product is in another store', async () => {
    (prismaMock.product.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      inventoryService.getInventoryProduct(OTHER_STORE, UserRole.ADMIN, PRODUCT_ID),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('deducts stock for sale lines and skips untracked', async () => {
    (prismaMock.product.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ...PRODUCT, stockQty: 5 })
      .mockResolvedValueOnce({ ...PRODUCT, id: 'prod_2', trackStock: false, stockQty: 0 });
    (prismaMock.product.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
    (prismaMock.stockMovement.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'mov_sale',
      storeId: STORE_ID,
      productId: PRODUCT_ID,
      quantity: -1,
      quantityBefore: 5,
      quantityAfter: 4,
      movementType: StockMovementType.SALE,
      referenceType: 'SALE',
      referenceId: 'sale_1',
      reason: 'Sale #100',
      createdById: ADMIN_ID,
      createdAt: new Date(),
      product: { id: PRODUCT_ID, name: PRODUCT.name, sku: PRODUCT.sku },
      createdBy: null,
    });

    await inventoryService.deductStockForSale(prismaMock as never, {
      storeId: STORE_ID,
      saleId: 'sale_1',
      saleNumber: 100,
      actorId: ADMIN_ID,
      lines: [
        {
          productId: PRODUCT_ID,
          productName: PRODUCT.name,
          quantity: 1,
          trackStock: true,
        },
        {
          productId: 'prod_2',
          productName: 'Custom',
          quantity: 1,
          trackStock: false,
        },
      ],
    });

    expect(prismaMock.stockMovement.create).toHaveBeenCalledTimes(1);
  });
});
