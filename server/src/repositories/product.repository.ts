import type { ProductLookupItem } from '@furniture-erp/shared';
import type { Prisma, Product } from '@prisma/client';

import { fromDbMoney } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';

const lookupSelect = {
  id: true,
  name: true,
  sku: true,
  imageUrl: true,
  costPrice: true,
  defaultSalePrice: true,
  stockQty: true,
  minStockQty: true,
  trackStock: true,
  category: { select: { name: true } },
} satisfies Prisma.ProductSelect;

export function toProductLookup(product: {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  costPrice: bigint;
  defaultSalePrice: bigint;
  stockQty: number;
  minStockQty: number;
  trackStock: boolean;
  category: { name: string } | null;
}): ProductLookupItem {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    imageUrl: product.imageUrl,
    costPrice: fromDbMoney(product.costPrice),
    defaultSalePrice: fromDbMoney(product.defaultSalePrice),
    categoryName: product.category?.name ?? null,
    stockQty: product.stockQty,
    minStockQty: product.minStockQty,
    trackStock: product.trackStock,
  };
}

export function findActiveProductsByIds(
  storeId: string,
  productIds: string[],
): Promise<Product[]> {
  if (productIds.length === 0) return Promise.resolve([]);

  return prisma.product.findMany({
    where: {
      storeId,
      status: 'ACTIVE',
      id: { in: productIds },
    },
  });
}

export async function searchProducts(
  storeId: string,
  query: string | undefined,
  limit = 20,
): Promise<ProductLookupItem[]> {
  const rows = await prisma.product.findMany({
    where: {
      storeId,
      status: 'ACTIVE',
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { sku: { contains: query, mode: 'insensitive' } },
              { category: { name: { contains: query, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    select: lookupSelect,
    orderBy: { name: 'asc' },
    take: limit,
  });

  return rows.map(toProductLookup);
}
