import type {
  InventoryListQuery,
  InventoryListResponse,
  InventoryProductDetailResponse,
  StockAdjustRequest,
  StockHistoryQuery,
  StockHistoryResponse,
  StockInRequest,
  StockMutationResponse,
  StockOutRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const inventoryService = {
  async list(params: InventoryListQuery = {}, signal?: AbortSignal): Promise<InventoryListResponse> {
    return apiClient.get<InventoryListResponse>('/inventory', {
      searchParams: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        stockFilter: params.stockFilter,
      },
      signal,
    });
  },

  async getProduct(id: string, signal?: AbortSignal): Promise<InventoryProductDetailResponse> {
    return apiClient.get<InventoryProductDetailResponse>(`/inventory/products/${id}`, { signal });
  },

  async history(
    params: StockHistoryQuery = {},
    signal?: AbortSignal,
  ): Promise<StockHistoryResponse> {
    return apiClient.get<StockHistoryResponse>('/inventory/history', {
      searchParams: {
        page: params.page,
        pageSize: params.pageSize,
        productId: params.productId,
        movementType: params.movementType,
        search: params.search,
      },
      signal,
    });
  },

  async stockIn(body: StockInRequest): Promise<StockMutationResponse> {
    return apiClient.post<StockMutationResponse>('/inventory/stock-in', { body });
  },

  async stockOut(body: StockOutRequest): Promise<StockMutationResponse> {
    return apiClient.post<StockMutationResponse>('/inventory/stock-out', { body });
  },

  async adjust(body: StockAdjustRequest): Promise<StockMutationResponse> {
    return apiClient.post<StockMutationResponse>('/inventory/adjust', { body });
  },
};
