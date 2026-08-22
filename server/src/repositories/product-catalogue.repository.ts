import {
  REVENUE_SALE_STATUSES,
  StockMovementType,
  buildPaginationMeta,
  deriveStockStatus,
  normalisePagination,
  type CreateProductCategoryRequest,
  type CreateProductRequest,
  type ProductCatalogueSummary,
  type ProductCategoryItem,
  type ProductDetail,
  type ProductListItem,
  type ProductListQuery,
  type ProductListResponse,
  type ProductSalesSummary,
  type ProductStockMovementSummary,
  type UpdateProductCategoryRequest,
  type UpdateProductRequest,
} from '@furniture-erp/shared';
import type { Prisma, Product, ProductCategory, ProductStatus } from '@prisma/client';

import { fromDbMoney, toDbMoney } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';

const productInclude = {
  category: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude;

type ProductWithCategory = Product & {
  category: { id: string; name: string } | null;
};

function normaliseSku(sku: string | null | undefined): string | null {
  if (sku === undefined || sku === null) return null;
  const trimmed = sku.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function toProductListItem(product: ProductWithCategory): ProductListItem {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    imageUrl: product.imageUrl,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    costPrice: fromDbMoney(product.costPrice),
    defaultSalePrice: fromDbMoney(product.defaultSalePrice),
    stockQty: product.stockQty,
    minStockQty: product.minStockQty,
    trackStock: product.trackStock,
    stockStatus: deriveStockStatus({
      trackStock: product.trackStock,
      stockQty: product.stockQty,
      minStockQty: product.minStockQty,
    }),
    status: product.status,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function toCategoryItem(
  category: ProductCategory & { _count?: { products: number } },
): ProductCategoryItem {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    productCount: category._count?.products ?? 0,
  };
}

function buildCatalogueWhere(
  storeId: string,
  query: ProductListQuery,
): Prisma.ProductWhereInput {
  const status = query.status ?? 'ACTIVE';
  const where: Prisma.ProductWhereInput = {
    storeId,
    ...(status === 'ALL' ? {} : { status: status as ProductStatus }),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { sku: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const stock = query.stockFilter;
  if (!stock || stock === 'ALL') return where;
  if (stock === 'UNTRACKED') return { ...where, trackStock: false };
  if (stock === 'OUT_OF_STOCK') {
    return { ...where, trackStock: true, stockQty: { lte: 0 } };
  }
  // LOW_STOCK / IN_STOCK are refined after fetch via deriveStockStatus.
  return { ...where, trackStock: true, stockQty: { gt: 0 } };
}

export async function summarizeCatalogue(storeId: string): Promise<ProductCatalogueSummary> {
  const products = await prisma.product.findMany({
    where: { storeId },
    select: { status: true, trackStock: true, stockQty: true, minStockQty: true },
  });

  let activeCount = 0;
  let archivedCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const product of products) {
    if (product.status === 'ACTIVE') activeCount += 1;
    else archivedCount += 1;
    if (product.status !== 'ACTIVE') continue;
    const status = deriveStockStatus(product);
    if (status === 'LOW_STOCK') lowStockCount += 1;
    if (status === 'OUT_OF_STOCK') outOfStockCount += 1;
  }

  return {
    totalProducts: products.length,
    activeCount,
    archivedCount,
    lowStockCount,
    outOfStockCount,
  };
}

export async function listCatalogueProducts(
  storeId: string,
  query: ProductListQuery = {},
): Promise<ProductListResponse> {
  const { page, pageSize } = normalisePagination(query.page, query.pageSize);
  const where = buildCatalogueWhere(storeId, query);
  const stockFilter = query.stockFilter;

  // When comparing stockQty to minStockQty, fetch a wider page then filter.
  const needsStatusRefine = stockFilter === 'LOW_STOCK' || stockFilter === 'IN_STOCK';

  if (!needsStatusRefine) {
    const [summary, total, rows] = await Promise.all([
      summarizeCatalogue(storeId),
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: [{ name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      summary,
      items: rows.map(toProductListItem),
      meta: buildPaginationMeta(page, pageSize, total),
    };
  }

  const all = await prisma.product.findMany({
    where,
    include: productInclude,
    orderBy: [{ name: 'asc' }],
  });
  const refined = all.filter((product) => {
    const status = deriveStockStatus(product);
    return stockFilter === 'LOW_STOCK'
      ? status === 'LOW_STOCK'
      : status === 'IN_STOCK';
  });
  const slice = refined.slice((page - 1) * pageSize, page * pageSize);
  const summary = await summarizeCatalogue(storeId);
  return {
    summary,
    items: slice.map(toProductListItem),
    meta: buildPaginationMeta(page, pageSize, refined.length),
  };
}

export async function findProductInStore(
  storeId: string,
  productId: string,
): Promise<ProductWithCategory | null> {
  return prisma.product.findFirst({
    where: { storeId, id: productId },
    include: productInclude,
  });
}

async function loadStockSummary(
  storeId: string,
  productId: string,
  currentQty: number,
): Promise<ProductStockMovementSummary> {
  const movements = await prisma.stockMovement.groupBy({
    by: ['movementType'],
    where: { storeId, productId },
    _sum: { quantity: true },
  });

  let stockIn = 0;
  let sold = 0;
  let cancelledRestored = 0;
  let manualAdjustments = 0;

  for (const row of movements) {
    const qty = row._sum.quantity ?? 0;
    switch (row.movementType) {
      case StockMovementType.PURCHASE:
      case StockMovementType.MANUAL_IN:
        stockIn += Math.max(0, qty);
        break;
      case StockMovementType.SALE:
        sold += Math.abs(Math.min(0, qty));
        break;
      case StockMovementType.SALE_CANCEL:
        cancelledRestored += Math.max(0, qty);
        break;
      case StockMovementType.MANUAL_OUT:
        stockIn += 0;
        manualAdjustments += qty; // negative
        break;
      case StockMovementType.ADJUSTMENT:
        manualAdjustments += qty;
        break;
      default:
        break;
    }
  }

  return {
    stockIn,
    sold,
    cancelledRestored,
    manualAdjustments,
    currentQty,
  };
}

async function loadSalesSummary(
  storeId: string,
  productId: string,
): Promise<ProductSalesSummary> {
  const items = await prisma.saleItem.findMany({
    where: {
      storeId,
      productId,
      sale: { status: { in: [...REVENUE_SALE_STATUSES] } },
    },
    select: {
      quantity: true,
      lineSaleTotal: true,
      lineCostTotal: true,
      saleId: true,
    },
  });

  let unitsSold = 0;
  let revenue = 0n;
  let cogs = 0n;
  const saleIds = new Set<string>();

  for (const item of items) {
    unitsSold += item.quantity;
    revenue += item.lineSaleTotal;
    cogs += item.lineCostTotal;
    saleIds.add(item.saleId);
  }

  return {
    unitsSold,
    revenue: fromDbMoney(revenue),
    cogs: fromDbMoney(cogs),
    grossProfit: fromDbMoney(revenue - cogs),
    saleCount: saleIds.size,
  };
}

export async function getProductDetail(
  storeId: string,
  productId: string,
): Promise<ProductDetail | null> {
  const product = await findProductInStore(storeId, productId);
  if (!product) return null;

  const [stockSummary, salesSummary] = await Promise.all([
    loadStockSummary(storeId, productId, product.stockQty),
    loadSalesSummary(storeId, productId),
  ]);

  return {
    ...toProductListItem(product),
    imageKey: product.imageKey,
    stockSummary,
    salesSummary,
  };
}

export async function createProduct(
  storeId: string,
  input: CreateProductRequest,
): Promise<ProductListItem> {
  const created = await prisma.product.create({
    data: {
      storeId,
      name: input.name.trim(),
      sku: normaliseSku(input.sku),
      categoryId: input.categoryId ?? null,
      description: input.description?.trim() || null,
      costPrice: toDbMoney(input.costPrice),
      defaultSalePrice: toDbMoney(input.defaultSalePrice),
      stockQty: 0,
      minStockQty: input.minStockQty ?? 0,
      trackStock: input.trackStock ?? true,
      status: 'ACTIVE',
    },
    include: productInclude,
  });
  return toProductListItem(created);
}

export async function updateProduct(
  storeId: string,
  productId: string,
  input: UpdateProductRequest,
): Promise<ProductListItem | null> {
  const existing = await findProductInStore(storeId, productId);
  if (!existing) return null;

  const data: Prisma.ProductUpdateInput = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.costPrice !== undefined) data.costPrice = toDbMoney(input.costPrice);
  if (input.defaultSalePrice !== undefined) {
    data.defaultSalePrice = toDbMoney(input.defaultSalePrice);
  }
  if (input.sku !== undefined) data.sku = normaliseSku(input.sku);
  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }
  if (input.minStockQty !== undefined) data.minStockQty = input.minStockQty;
  if (input.trackStock !== undefined) data.trackStock = input.trackStock;
  if (input.status !== undefined) data.status = input.status;
  if (input.categoryId !== undefined) {
    data.category =
      input.categoryId === null
        ? { disconnect: true }
        : { connect: { id: input.categoryId } };
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data,
    include: productInclude,
  });
  return toProductListItem(updated);
}

export async function setProductImage(
  storeId: string,
  productId: string,
  image: { key: string; url: string } | null,
): Promise<ProductListItem | null> {
  const existing = await findProductInStore(storeId, productId);
  if (!existing) return null;

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      imageKey: image?.key ?? null,
      imageUrl: image?.url ?? null,
    },
    include: productInclude,
  });
  return toProductListItem(updated);
}

export async function listProductCategories(
  storeId: string,
  options?: { includeInactive?: boolean },
): Promise<ProductCategoryItem[]> {
  const rows = await prisma.productCategory.findMany({
    where: {
      storeId,
      ...(options?.includeInactive ? {} : { isActive: true }),
    },
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return rows.map(toCategoryItem);
}

export async function findCategoryInStore(
  storeId: string,
  categoryId: string,
): Promise<ProductCategory | null> {
  return prisma.productCategory.findFirst({ where: { storeId, id: categoryId } });
}

export async function createProductCategory(
  storeId: string,
  input: CreateProductCategoryRequest,
): Promise<ProductCategoryItem> {
  const created = await prisma.productCategory.create({
    data: {
      storeId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: true,
    },
    include: { _count: { select: { products: true } } },
  });
  return toCategoryItem(created);
}

export async function updateProductCategory(
  storeId: string,
  categoryId: string,
  input: UpdateProductCategoryRequest,
): Promise<ProductCategoryItem | null> {
  const existing = await findCategoryInStore(storeId, categoryId);
  if (!existing) return null;

  const updated = await prisma.productCategory.update({
    where: { id: categoryId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
    include: { _count: { select: { products: true } } },
  });
  return toCategoryItem(updated);
}

export async function deactivateProductCategory(
  storeId: string,
  categoryId: string,
): Promise<ProductCategoryItem | null> {
  const existing = await findCategoryInStore(storeId, categoryId);
  if (!existing) return null;

  const updated = await prisma.productCategory.update({
    where: { id: categoryId },
    data: { isActive: false },
    include: { _count: { select: { products: true } } },
  });
  return toCategoryItem(updated);
}
