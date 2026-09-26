import type {
  CreatePersonalCategoryRequest,
  CreatePersonalEntryRequest,
  CreatePersonalTransferRequest,
  CreatePersonalWalletRequest,
  PersonalCategoryKind,
  PersonalEntryListQuery,
  PersonalEntryType,
  PersonalHistoryListQuery,
  PersonalTransferListQuery,
  UpdatePersonalCategoryRequest,
  UpdatePersonalEntryRequest,
  UpdatePersonalWalletRequest,
} from '@furniture-erp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalLedgerService } from '@/services/personal-ledger.service';

export const personalLedgerKeys = {
  summary: ['personal', 'summary'] as const,
  history: (query: PersonalHistoryListQuery) => ['personal', 'history', query] as const,
  wallets: ['personal', 'wallets'] as const,
  categories: (kind?: PersonalCategoryKind) => ['personal', 'categories', kind ?? 'all'] as const,
  entries: (query: PersonalEntryListQuery) => ['personal', 'entries', query] as const,
  transfers: (query: PersonalTransferListQuery) => ['personal', 'transfers', query] as const,
};

function invalidateLedger(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: personalLedgerKeys.summary });
  void queryClient.invalidateQueries({ queryKey: ['personal', 'history'] });
  void queryClient.invalidateQueries({ queryKey: personalLedgerKeys.wallets });
  void queryClient.invalidateQueries({ queryKey: ['personal', 'categories'] });
  void queryClient.invalidateQueries({ queryKey: ['personal', 'entries'] });
  void queryClient.invalidateQueries({ queryKey: ['personal', 'transfers'] });
  void queryClient.invalidateQueries({ queryKey: ['personal', 'notifications'] });
}

export function usePersonalSummary() {
  return useQuery({
    queryKey: personalLedgerKeys.summary,
    queryFn: ({ signal }) => personalLedgerService.summary(signal),
  });
}

export function usePersonalHistory(query: PersonalHistoryListQuery) {
  return useQuery({
    queryKey: personalLedgerKeys.history(query),
    queryFn: ({ signal }) => personalLedgerService.history(query, signal),
  });
}

export function usePersonalWallets(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: personalLedgerKeys.wallets,
    queryFn: ({ signal }) => personalLedgerService.wallets(signal),
    enabled: options?.enabled ?? true,
  });
}

export function useCreatePersonalWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePersonalWalletRequest) => personalLedgerService.createWallet(body),
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function useUpdatePersonalWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePersonalWalletRequest }) =>
      personalLedgerService.updateWallet(id, body),
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function usePersonalCategories(
  kind?: PersonalCategoryKind,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: personalLedgerKeys.categories(kind),
    queryFn: ({ signal }) => personalLedgerService.categories(kind, signal),
    enabled: options?.enabled ?? true,
  });
}

export function useCreatePersonalCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePersonalCategoryRequest) => personalLedgerService.createCategory(body),
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function useUpdatePersonalCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePersonalCategoryRequest }) =>
      personalLedgerService.updateCategory(id, body),
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function usePersonalEntries(query: PersonalEntryListQuery) {
  return useQuery({
    queryKey: personalLedgerKeys.entries(query),
    queryFn: ({ signal }) => personalLedgerService.entries(query, signal),
  });
}

export function useCreatePersonalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePersonalEntryRequest) => personalLedgerService.createEntry(body),
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function useUpdatePersonalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePersonalEntryRequest }) =>
      personalLedgerService.updateEntry(id, body),
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function useCancelPersonalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => personalLedgerService.cancelEntry(id),
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function usePersonalTransfers(query: PersonalTransferListQuery) {
  return useQuery({
    queryKey: personalLedgerKeys.transfers(query),
    queryFn: ({ signal }) => personalLedgerService.transfers(query, signal),
  });
}

export function useCreatePersonalTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePersonalTransferRequest) => personalLedgerService.createTransfer(body),
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function useCancelPersonalTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => personalLedgerService.cancelTransfer(id),
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function entryQuery(type: PersonalEntryType): PersonalEntryListQuery {
  return { type, page: 1, pageSize: 20 };
}
