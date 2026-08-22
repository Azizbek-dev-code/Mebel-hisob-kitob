import type {
  CancelExpenseRequest,
  CancelExpenseResponse,
  CreateExpenseCategoryRequest,
  CreateExpenseCategoryResponse,
  CreateExpenseRequest,
  CreateExpenseResponse,
  ExpenseCategoryItem,
  ExpenseCategoryListResponse,
  ExpenseDetail,
  ExpenseDetailResponse,
  ExpenseListQuery,
  ExpenseListResponse,
  UpdateExpenseRequest,
  UpdateExpenseResponse,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const expensesService = {
  async list(params: ExpenseListQuery = {}, signal?: AbortSignal): Promise<ExpenseListResponse> {
    return apiClient.get<ExpenseListResponse>('/expenses', {
      searchParams: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        categoryId: params.categoryId,
        status: params.status,
        from: params.from,
        to: params.to,
      },
      signal,
    });
  },

  async get(id: string, signal?: AbortSignal): Promise<ExpenseDetail> {
    const { expense } = await apiClient.get<ExpenseDetailResponse>(`/expenses/${id}`, { signal });
    return expense;
  },

  async create(body: CreateExpenseRequest): Promise<ExpenseDetail> {
    const { expense } = await apiClient.post<CreateExpenseResponse>('/expenses', { body });
    return expense;
  },

  async update(id: string, body: UpdateExpenseRequest): Promise<ExpenseDetail> {
    const { expense } = await apiClient.patch<UpdateExpenseResponse>(`/expenses/${id}`, { body });
    return expense;
  },

  async cancel(id: string, body: CancelExpenseRequest): Promise<ExpenseDetail> {
    const { expense } = await apiClient.post<CancelExpenseResponse>(`/expenses/${id}/cancel`, {
      body,
    });
    return expense;
  },

  async listCategories(signal?: AbortSignal): Promise<ExpenseCategoryItem[]> {
    const { items } = await apiClient.get<ExpenseCategoryListResponse>('/expense-categories', {
      signal,
    });
    return items;
  },

  async createCategory(body: CreateExpenseCategoryRequest): Promise<ExpenseCategoryItem> {
    const { category } = await apiClient.post<CreateExpenseCategoryResponse>(
      '/expense-categories',
      { body },
    );
    return category;
  },

  async deactivateCategory(id: string): Promise<ExpenseCategoryItem> {
    const { category } = await apiClient.post<CreateExpenseCategoryResponse>(
      `/expense-categories/${id}/deactivate`,
    );
    return category;
  },
};
