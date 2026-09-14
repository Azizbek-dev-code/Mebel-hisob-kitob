import type {
  CreatePersonalCategoryRequest,
  CreatePersonalEntryRequest,
  CreatePersonalTransferRequest,
  CreatePersonalWalletRequest,
  PersonalCategoryKind,
  PersonalCategoryListResponse,
  PersonalEntryListQuery,
  PersonalEntryListResponse,
  PersonalHistoryListQuery,
  PersonalHistoryResponse,
  PersonalSummaryResponse,
  PersonalTransferListQuery,
  PersonalTransferListResponse,
  PersonalWalletListResponse,
  UpdatePersonalCategoryRequest,
  UpdatePersonalEntryRequest,
  UpdatePersonalWalletRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const personalLedgerService = {
  summary(signal?: AbortSignal) {
    return apiClient.get<PersonalSummaryResponse>('/personal/summary', { signal });
  },
  history(query: PersonalHistoryListQuery, signal?: AbortSignal) {
    return apiClient.get<PersonalHistoryResponse>('/personal/history', {
      signal,
      searchParams: { ...query },
    });
  },
  wallets(signal?: AbortSignal) {
    return apiClient.get<PersonalWalletListResponse>('/personal/wallets', { signal });
  },
  createWallet(body: CreatePersonalWalletRequest) {
    return apiClient.post<{ wallet: PersonalWalletListResponse['items'][number] }>(
      '/personal/wallets',
      { body },
    );
  },
  updateWallet(id: string, body: UpdatePersonalWalletRequest) {
    return apiClient.patch<{ wallet: PersonalWalletListResponse['items'][number] }>(
      `/personal/wallets/${id}`,
      { body },
    );
  },
  categories(kind?: PersonalCategoryKind, signal?: AbortSignal) {
    return apiClient.get<PersonalCategoryListResponse>('/personal/categories', {
      signal,
      searchParams: { kind },
    });
  },
  createCategory(body: CreatePersonalCategoryRequest) {
    return apiClient.post<{ category: PersonalCategoryListResponse['items'][number] }>(
      '/personal/categories',
      { body },
    );
  },
  updateCategory(id: string, body: UpdatePersonalCategoryRequest) {
    return apiClient.patch<{ category: PersonalCategoryListResponse['items'][number] }>(
      `/personal/categories/${id}`,
      { body },
    );
  },
  entries(query: PersonalEntryListQuery, signal?: AbortSignal) {
    return apiClient.get<PersonalEntryListResponse>('/personal/entries', {
      signal,
      searchParams: { ...query },
    });
  },
  createEntry(body: CreatePersonalEntryRequest) {
    return apiClient.post<{ entry: PersonalEntryListResponse['items'][number] }>(
      '/personal/entries',
      { body },
    );
  },
  updateEntry(id: string, body: UpdatePersonalEntryRequest) {
    return apiClient.patch<{ entry: PersonalEntryListResponse['items'][number] }>(
      `/personal/entries/${id}`,
      { body },
    );
  },
  cancelEntry(id: string) {
    return apiClient.post<{ entry: PersonalEntryListResponse['items'][number] }>(
      `/personal/entries/${id}/cancel`,
    );
  },
  transfers(query: PersonalTransferListQuery, signal?: AbortSignal) {
    return apiClient.get<PersonalTransferListResponse>('/personal/transfers', {
      signal,
      searchParams: { ...query },
    });
  },
  createTransfer(body: CreatePersonalTransferRequest) {
    return apiClient.post<{ transfer: PersonalTransferListResponse['items'][number] }>(
      '/personal/transfers',
      { body },
    );
  },
  cancelTransfer(id: string) {
    return apiClient.post<{ transfer: PersonalTransferListResponse['items'][number] }>(
      `/personal/transfers/${id}/cancel`,
    );
  },
};
