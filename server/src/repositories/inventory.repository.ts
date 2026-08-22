import type {
  InventoryListItem,
  InventoryProductSummary,
  InventoryStockFilter,
  InventorySummary,
  StockMovementListItem,
  StockMovementType,
} from '@furniture-erp/shared';
import { deriveStockStatus, StockReferenceType } from '@furniture-erp/shared';
import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

export type InventoryTxClient = Prisma.TransactionClient;

const movementInclude = {
  product: { select: { id: true, name: true, sku: true } },
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.StockMovementInclude;

type MovementRow = Prisma.StockMovementGetPayload<{ include: typeof movementInclude }>;

export function toProductSummary(product: {
  id: string;
  name: string;
  sku: string | null;
  stockQty: number;
  minStockQty: number;
  trackStock: boolean;
}): InventoryProductSummary {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    stockQty: product.stockQty,
    minStockQty: product.minStockQty,
    trackStock: product.trackStock,
    stockStatus: deriveStockStatus(product),
  };
}

export function toMovementListItem(row: MovementRow): StockMovementListItem {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.product.name,
    productSku: row.product.sku,
    quantity: row.quantity,
    quantityBefore: row.quantityBefore,
    quantityAfter: row.quantityAfter,
    movementType: row.movementType,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    reason: row.reason,
    createdBy: row.createdBy
      ? { id: row.createdBy.id, fullName: row.createdBy.fullName }
      : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function buildProductListWhere(options: {
  storeId: string;
  search?: string;
  stockFilter?: InventoryStockFilter;
}): Prisma.ProductWhereInput {
  const search = options.search?.trim();
  const base: Prisma.ProductWhereInput = {
    storeId: options.storeId,
    status: 'ACTIVE',
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const filter = options.stockFilter;
  if (!filter || filter === 'ALL') {
    return base;
  }
  if (filter === 'OUT_OF_STOCK') {
    return { ...base, trackStock: true, stockQty: { lte: 0 } };
  }
  if (filter === 'LOW_STOCK') {
    return { ...base, trackStock: true, stockQty: { gt: 0 }, minStockQty: { gt: 0 } };
  }
  return { ...base, trackStock: true, stockQty: { gt: 0 } };
}

export async function listInventoryProducts(options: {
  storeId: string;
  search?: string;
  stockFilter?: InventoryStockFilter;
  page: number;
  pageSize: number;
}): Promise<{ items: InventoryListItem[]; total: number }> {
  if (options.stockFilter === 'LOW_STOCK' || options.stockFilter === 'IN_STOCK') {
    const search = options.search?.trim();
    const searchSql = search
      ? Prisma.sql`AND (p.name ILIKE ${`%${search}%`} OR COALESCE(p.sku, '') ILIKE ${`%${search}%`})`
      : Prisma.empty;
    const statusSql =
      options.stockFilter === 'LOW_STOCK'
        ? Prisma.sql`AND p."trackStock" = true AND p."stockQty" > 0 AND p."minStockQty" > 0 AND p."stockQty" <= p."minStockQty"`
        : Prisma.sql`AND p."trackStock" = true AND p."stockQty" > 0 AND (p."minStockQty" <= 0 OR p."stockQty" > p."minStockQty")`;

    const countRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM products p
      WHERE p."storeId" = ${options.storeId}
        AND p.status = 'ACTIVE'
        ${searchSql}
        ${statusSql}
    `;
    const total = Number(countRows[0]?.count ?? 0n);
    const skip = (options.page - 1) * options.pageSize;

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        sku: string | null;
        stockQty: number;
        minStockQty: number;
        trackStock: boolean;
      }>
    >`
      SELECT p.id, p.name, p.sku, p."stockQty", p."minStockQty", p."trackStock"
      FROM products p
      WHERE p."storeId" = ${options.storeId}
        AND p.status = 'ACTIVE'
        ${searchSql}
        ${statusSql}
      ORDER BY p.name ASC
      LIMIT ${options.pageSize} OFFSET ${skip}
    `;

    const items = await attachLastMovements(options.storeId, rows);
    return { items, total };
  }

  const where = buildProductListWhere(options);
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
      select: {
        id: true,
        name: true,
        sku: true,
        stockQty: true,
        minStockQty: true,
        trackStock: true,
      },
    }),
  ]);

  const items = await attachLastMovements(options.storeId, products);
  return { items, total };
}

async function attachLastMovements(
  storeId: string,
  products: Array<{
    id: string;
    name: string;
    sku: string | null;
    stockQty: number;
    minStockQty: number;
    trackStock: boolean;
  }>,
): Promise<InventoryListItem[]> {
  if (products.length === 0) return [];

  const productIds = products.map((p) => p.id);
  const movements = await prisma.stockMovement.findMany({
    where: { storeId, productId: { in: productIds } },
    orderBy: { createdAt: 'desc' },
    distinct: ['productId'],
    select: {
      productId: true,
      createdAt: true,
      movementType: true,
    },
  });
  const lastByProduct = new Map(movements.map((m) => [m.productId, m]));

  return products.map((product) => {
    const last = lastByProduct.get(product.id);
    return {
      ...toProductSummary(product),
      lastMovementAt: last?.createdAt.toISOString() ?? null,
      lastMovementType: last?.movementType ?? null,
    };
  });
}

export async function summarizeInventory(storeId: string): Promise<InventorySummary> {
  const [totalProducts, unitsAgg, outOfStockCount, lowRows] = await Promise.all([
    prisma.product.count({
      where: { storeId, status: 'ACTIVE' },
    }),
    prisma.product.aggregate({
      where: { storeId, status: 'ACTIVE', trackStock: true },
      _sum: { stockQty: true },
    }),
    prisma.product.count({
      where: { storeId, status: 'ACTIVE', trackStock: true, stockQty: { lte: 0 } },
    }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM products
      WHERE "storeId" = ${storeId}
        AND status = 'ACTIVE'
        AND "trackStock" = true
        AND "stockQty" > 0
        AND "minStockQty" > 0
        AND "stockQty" <= "minStockQty"
    `,
  ]);

  return {
    totalProducts,
    totalUnits: unitsAgg._sum.stockQty ?? 0,
    lowStockCount: Number(lowRows[0]?.count ?? 0n),
    outOfStockCount,
  };
}

export async function findProductInStore(
  storeId: string,
  productId: string,
  client: InventoryTxClient | typeof prisma = prisma,
) {
  return client.product.findFirst({
    where: { id: productId, storeId },
    include: { category: { select: { name: true } } },
  });
}

export async function listStockMovements(options: {
  storeId: string;
  productId?: string;
  movementType?: StockMovementType;
  search?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: StockMovementListItem[]; total: number }> {
  const search = options.search?.trim();
  const where: Prisma.StockMovementWhereInput = {
    storeId: options.storeId,
    ...(options.productId ? { productId: options.productId } : {}),
    ...(options.movementType ? { movementType: options.movementType } : {}),
    ...(search
      ? {
          OR: [
            { product: { name: { contains: search, mode: 'insensitive' } } },
            { product: { sku: { contains: search, mode: 'insensitive' } } },
            { reason: { contains: search, mode: 'insensitive' } },
            { referenceId: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      include: movementInclude,
      orderBy: { createdAt: 'desc' },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
    }),
  ]);

  return { items: rows.map(toMovementListItem), total };
}

/**
 * Atomically apply a signed stock delta and append a movement row.
 * Rejects when the result would be negative.
 */
export async function applyStockDelta(
  tx: InventoryTxClient,
  input: {
    storeId: string;
    productId: string;
    quantityDelta: number;
    movementType: StockMovementType;
    referenceType?: StockReferenceType | null;
    referenceId?: string | null;
    reason?: string | null;
    createdById?: string | null;
    productNameForError?: string;
  },
): Promise<{ movement: StockMovementListItem; stockQty: number }> {
  if (input.quantityDelta === 0) {
    throw Object.assign(new Error('ZERO_DELTA'), { code: 'ZERO_DELTA' });
  }

  const product = await tx.product.findFirst({
    where: { id: input.productId, storeId: input.storeId },
  });
  if (!product) {
    throw Object.assign(new Error('PRODUCT_NOT_FOUND'), { code: 'PRODUCT_NOT_FOUND' });
  }

  if (!product.trackStock) {
    throw Object.assign(new Error('STOCK_NOT_TRACKED'), { code: 'STOCK_NOT_TRACKED' });
  }

  const quantityBefore = product.stockQty;
  const quantityAfter = quantityBefore + input.quantityDelta;
  if (quantityAfter < 0) {
    throw Object.assign(new Error('INSUFFICIENT_STOCK'), {
      code: 'INSUFFICIENT_STOCK',
      productName: input.productNameForError ?? product.name,
      available: quantityBefore,
      requested: Math.abs(input.quantityDelta),
    });
  }

  const updated =
    input.quantityDelta < 0
      ? await tx.product.updateMany({
          where: {
            id: product.id,
            storeId: input.storeId,
            trackStock: true,
            stockQty: { gte: Math.abs(input.quantityDelta) },
          },
          data: { stockQty: quantityAfter },
        })
      : await tx.product.updateMany({
          where: {
            id: product.id,
            storeId: input.storeId,
            trackStock: true,
            stockQty: quantityBefore,
          },
          data: { stockQty: quantityAfter },
        });

  if (updated.count !== 1) {
    throw Object.assign(new Error('INSUFFICIENT_STOCK'), {
      code: 'INSUFFICIENT_STOCK',
      productName: input.productNameForError ?? product.name,
      available: quantityBefore,
      requested: Math.abs(input.quantityDelta),
    });
  }

  const movement = await tx.stockMovement.create({
    data: {
      storeId: input.storeId,
      productId: product.id,
      quantity: input.quantityDelta,
      quantityBefore,
      quantityAfter,
      movementType: input.movementType,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      reason: input.reason ?? null,
      createdById: input.createdById ?? null,
    },
    include: movementInclude,
  });

  return { movement: toMovementListItem(movement), stockQty: quantityAfter };
}

export { StockReferenceType };
