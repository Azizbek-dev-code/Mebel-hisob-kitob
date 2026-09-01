import type { ProductStatus, StockMovementType, StockStatus } from '../constants/enums.js';
import type { IsoDateString, Money, PaginatedResult, PaginationQuery } from './api.js';

/**
 * Product catalogue (Mebellar) API contract.
 *
 * Money is whole so'm. `storeId` is never accepted from the client.
 * SaleItem snapshots unitCostPrice / unitSalePrice — catalogue price edits
 * never rewrite historical sales.
 */

export interface ProductCategoryItem {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export interface ProductListItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  costPrice: Money;
  defaultSalePrice: Money;
  stockQty: number;
  minStockQty: number;
  trackStock: boolean;
  stockStatus: StockStatus;
  status: ProductStatus;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ProductStockMovementSummary {
  stockIn: number;
  sold: number;
  cancelledRestored: number;
  manualAdjustments: number;
  /** Current on-hand quantity (Product.stockQty). */
  currentQty: number;
}

export interface ProductSalesSummary {
  unitsSold: number;
  revenue: Money;
  cogs: Money;
  grossProfit: Money;
  saleCount: number;
}

export interface ProductDetail extends ProductListItem {
  imageKey: string | null;
  stockSummary: ProductStockMovementSummary;
  salesSummary: ProductSalesSummary;
}

export interface ProductCatalogueSummary {
  totalProducts: number;
  activeCount: number;
  archivedCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export type ProductCatalogueStatusFilter = ProductStatus | 'ALL';
export type ProductCatalogueStockFilter =
  | 'ALL'
  | 'IN_STOCK'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'UNTRACKED';

export interface ProductListQuery extends PaginationQuery {
  search?: string;
  status?: ProductCatalogueStatusFilter;
  stockFilter?: ProductCatalogueStockFilter;
  categoryId?: string;
}

export interface ProductListResponse {
  summary: ProductCatalogueSummary;
  items: ProductListItem[];
  meta: PaginatedResult<ProductListItem>['meta'];
}

export interface CreateProductRequest {
  name: string;
  /** Optional — omit or 0 when unknown; can be filled in later via edit. */
  costPrice?: Money;
  defaultSalePrice: Money;
  /** Optional — server assigns a unique store SKU when omitted. */
  sku?: string | null;
  categoryId?: string | null;
  description?: string | null;
  minStockQty?: number;
  trackStock?: boolean;
}

export interface UpdateProductRequest {
  name?: string;
  costPrice?: Money;
  defaultSalePrice?: Money;
  sku?: string | null;
  categoryId?: string | null;
  description?: string | null;
  minStockQty?: number;
  trackStock?: boolean;
  status?: ProductStatus;
}

export interface CreateProductCategoryRequest {
  name: string;
  description?: string | null;
  sortOrder?: number;
}

export interface UpdateProductCategoryRequest {
  name?: string;
  description?: string | null;
  sortOrder?: number;
}

export type ProductListApiResponse = ProductListResponse;
export type ProductDetailResponse = { product: ProductDetail };
export type ProductMutationResponse = { product: ProductListItem };
export type ProductCategoryListResponse = { categories: ProductCategoryItem[] };
export type ProductCategoryMutationResponse = { category: ProductCategoryItem };
export type ProductImageUploadResponse = { product: ProductListItem };

/** Movement types counted in stock summary (documentation aid). */
export type ProductStockSummaryMovementType = StockMovementType;
