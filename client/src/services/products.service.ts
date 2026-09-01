import type {
  CreateProductCategoryRequest,
  CreateProductRequest,
  ProductCategoryItem,
  ProductCategoryListResponse,
  ProductCategoryMutationResponse,
  ProductDetail,
  ProductDetailResponse,
  ProductImageUploadResponse,
  ProductListItem,
  ProductListQuery,
  ProductListResponse,
  ProductMutationResponse,
  UpdateProductCategoryRequest,
  UpdateProductRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

/**
 * Product catalogue API — admin CRUD.
 * Sale-form lookup stays on lookupsService.products → GET /products/options.
 */
export const productsService = {
  async list(query: ProductListQuery = {}, signal?: AbortSignal): Promise<ProductListResponse> {
    return apiClient.get<ProductListResponse>('/products', {
      searchParams: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        status: query.status,
        stockFilter: query.stockFilter,
        categoryId: query.categoryId,
      },
      signal,
    });
  },

  async get(id: string, signal?: AbortSignal): Promise<ProductDetail> {
    const { product } = await apiClient.get<ProductDetailResponse>(`/products/${id}`, { signal });
    return product;
  },

  async create(body: CreateProductRequest): Promise<ProductListItem> {
    const { product } = await apiClient.post<ProductMutationResponse>('/products', { body });
    return product;
  },

  async update(id: string, body: UpdateProductRequest): Promise<ProductListItem> {
    const { product } = await apiClient.patch<ProductMutationResponse>(`/products/${id}`, {
      body,
    });
    return product;
  },

  async archive(id: string): Promise<ProductListItem> {
    const { product } = await apiClient.post<ProductMutationResponse>(`/products/${id}/archive`);
    return product;
  },

  async restore(id: string): Promise<ProductListItem> {
    const { product } = await apiClient.post<ProductMutationResponse>(`/products/${id}/restore`);
    return product;
  },

  async deletePermanent(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },

  async uploadImage(id: string, file: File): Promise<ProductListItem> {
    const form = new FormData();
    form.append('image', file);
    const { product } = await apiClient.post<ProductImageUploadResponse>(`/products/${id}/image`, {
      body: form,
    });
    return product;
  },

  async removeImage(id: string): Promise<ProductListItem> {
    const { product } = await apiClient.delete<ProductImageUploadResponse>(`/products/${id}/image`);
    return product;
  },

  async listCategories(
    options?: { includeInactive?: boolean },
    signal?: AbortSignal,
  ): Promise<ProductCategoryItem[]> {
    const { categories } = await apiClient.get<ProductCategoryListResponse>(
      '/product-categories',
      {
        searchParams: { includeInactive: options?.includeInactive ? 'true' : undefined },
        signal,
      },
    );
    return categories;
  },

  async createCategory(body: CreateProductCategoryRequest): Promise<ProductCategoryItem> {
    const { category } = await apiClient.post<ProductCategoryMutationResponse>(
      '/product-categories',
      { body },
    );
    return category;
  },

  async updateCategory(
    id: string,
    body: UpdateProductCategoryRequest,
  ): Promise<ProductCategoryItem> {
    const { category } = await apiClient.patch<ProductCategoryMutationResponse>(
      `/product-categories/${id}`,
      { body },
    );
    return category;
  },

  async deactivateCategory(id: string): Promise<ProductCategoryItem> {
    const { category } = await apiClient.post<ProductCategoryMutationResponse>(
      `/product-categories/${id}/deactivate`,
    );
    return category;
  },
};
