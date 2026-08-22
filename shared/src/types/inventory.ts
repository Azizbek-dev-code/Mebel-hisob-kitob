import type {
  StockMovementType,
  StockReferenceType,
  StockStatus,
} from '../constants/enums.js';
import type { IsoDateString, PaginatedResult, PaginationQuery } from './api.js';

export interface InventoryProductSummary {
  id: string;
  name: string;
  sku: string | null;
  stockQty: number;
  minStockQty: number;
  trackStock: boolean;
  stockStatus: StockStatus;
}

export interface InventoryListItem {
  id: string;
  name: string;
  sku: string | null;
  stockQty: number;
  minStockQty: number;
  trackStock: boolean;
  stockStatus: StockStatus;
  lastMovementAt: IsoDateString | null;
  lastMovementType: StockMovementType | null;
}

export interface InventorySummary {
  totalProducts: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export type InventoryStockFilter = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryListQuery extends PaginationQuery {
  search?: string;
  stockFilter?: InventoryStockFilter;
}

export interface InventoryListResponse {
  summary: InventorySummary;
  items: InventoryListItem[];
  meta: PaginatedResult<InventoryListItem>['meta'];
}

export interface StockMovementActor {
  id: string;
  fullName: string;
}

export interface StockMovementListItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string | null;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  movementType: StockMovementType;
  referenceType: StockReferenceType | null;
  referenceId: string | null;
  reason: string | null;
  createdBy: StockMovementActor | null;
  createdAt: IsoDateString;
}

export interface StockHistoryQuery extends PaginationQuery {
  productId?: string;
  movementType?: StockMovementType;
  search?: string;
}

export interface StockHistoryResponse {
  items: StockMovementListItem[];
  meta: PaginatedResult<StockMovementListItem>['meta'];
}

export interface StockInRequest {
  productId: string;
  quantity: number;
  reason: string;
}

export interface StockOutRequest {
  productId: string;
  quantity: number;
  reason: string;
}

export interface StockAdjustRequest {
  productId: string;
  /** Signed delta: positive increases, negative decreases. */
  quantity: number;
  reason: string;
}

export interface StockMutationResponse {
  product: InventoryProductSummary;
  movement: StockMovementListItem;
}

export interface InventoryProductDetailResponse {
  product: InventoryProductSummary & {
    description: string | null;
    imageUrl: string | null;
    categoryName: string | null;
  };
}
