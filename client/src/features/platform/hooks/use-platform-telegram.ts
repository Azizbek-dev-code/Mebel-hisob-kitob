import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateTelegramBroadcastRequest,
  TelegramAutoMessagePreviewRequest,
  UpdateTelegramAutomationRequest,
  UpdateTelegramBotTokenRequest,
  UpdateTelegramStartMessageRequest,
  UpsertTelegramAutoMessageRequest,
  UpsertTelegramMenuScreenRequest,
} from '@furniture-erp/shared';

import { platformTelegramService } from '@/services/platform-telegram.service';

export const platformTelegramKeys = {
  status: ['platform-telegram-status'] as const,
  stats: ['platform-telegram-stats'] as const,
  start: ['platform-telegram-start'] as const,
  menu: ['platform-telegram-menu'] as const,
  automations: ['platform-telegram-automations'] as const,
  autoMessages: ['platform-telegram-auto-messages'] as const,
  autoMessageCatalog: (accountType: string) =>
    ['platform-telegram-auto-message-catalog', accountType] as const,
  autoMessageTemplates: (accountType: string) =>
    ['platform-telegram-auto-message-templates', accountType] as const,
  users: (page: number) => ['platform-telegram-users', page] as const,
  broadcasts: (page: number) => ['platform-telegram-broadcasts', page] as const,
};

export function usePlatformTelegramStatus(enabled = true) {
  return useQuery({
    queryKey: platformTelegramKeys.status,
    queryFn: ({ signal }) => platformTelegramService.status(signal),
    enabled,
  });
}

export function usePlatformTelegramStats(enabled = true) {
  return useQuery({
    queryKey: platformTelegramKeys.stats,
    queryFn: ({ signal }) => platformTelegramService.stats(signal),
    enabled,
  });
}

export function useUpdateTelegramBotToken() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTelegramBotTokenRequest) => platformTelegramService.updateToken(body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: platformTelegramKeys.status });
    },
  });
}

export function usePlatformTelegramStart(enabled = true) {
  return useQuery({
    queryKey: platformTelegramKeys.start,
    queryFn: ({ signal }) => platformTelegramService.startMessage(signal),
    enabled,
  });
}

export function useUpdateTelegramStartMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTelegramStartMessageRequest) =>
      platformTelegramService.updateStartMessage(body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: platformTelegramKeys.start });
    },
  });
}

export function usePlatformTelegramMenu(enabled = true) {
  return useQuery({
    queryKey: platformTelegramKeys.menu,
    queryFn: ({ signal }) => platformTelegramService.menu(signal),
    enabled,
  });
}

export function useUpdateTelegramMenuScreen() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, body }: { slug: string; body: UpsertTelegramMenuScreenRequest }) =>
      platformTelegramService.updateMenuScreen(slug, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: platformTelegramKeys.menu });
    },
  });
}

export function usePlatformTelegramAutomations(enabled = true) {
  return useQuery({
    queryKey: platformTelegramKeys.automations,
    queryFn: ({ signal }) => platformTelegramService.automations(signal),
    enabled,
  });
}

export function useUpdateTelegramAutomation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, body }: { kind: string; body: UpdateTelegramAutomationRequest }) =>
      platformTelegramService.updateAutomation(kind, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: platformTelegramKeys.automations });
    },
  });
}

export function usePlatformTelegramAutoMessages(enabled = true) {
  return useQuery({
    queryKey: platformTelegramKeys.autoMessages,
    queryFn: ({ signal }) => platformTelegramService.autoMessages(signal),
    enabled,
  });
}

export function usePlatformTelegramAutoMessageCatalog(accountType: string, enabled = true) {
  return useQuery({
    queryKey: platformTelegramKeys.autoMessageCatalog(accountType),
    queryFn: ({ signal }) => platformTelegramService.autoMessageCatalog(accountType, signal),
    enabled: enabled && Boolean(accountType),
  });
}

export function usePlatformTelegramAutoMessageTemplates(accountType: string, enabled = true) {
  return useQuery({
    queryKey: platformTelegramKeys.autoMessageTemplates(accountType),
    queryFn: ({ signal }) => platformTelegramService.autoMessageTemplates(accountType, signal),
    enabled: enabled && Boolean(accountType),
  });
}

export function useCreateTelegramAutoMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertTelegramAutoMessageRequest) =>
      platformTelegramService.createAutoMessage(body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: platformTelegramKeys.autoMessages });
      void client.invalidateQueries({ queryKey: platformTelegramKeys.stats });
    },
  });
}

export function useUpdateTelegramAutoMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpsertTelegramAutoMessageRequest }) =>
      platformTelegramService.updateAutoMessage(id, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: platformTelegramKeys.autoMessages });
      void client.invalidateQueries({ queryKey: platformTelegramKeys.stats });
    },
  });
}

export function useDuplicateTelegramAutoMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => platformTelegramService.duplicateAutoMessage(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: platformTelegramKeys.autoMessages });
    },
  });
}

export function useDeleteTelegramAutoMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => platformTelegramService.deleteAutoMessage(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: platformTelegramKeys.autoMessages });
      void client.invalidateQueries({ queryKey: platformTelegramKeys.stats });
    },
  });
}

export function usePreviewTelegramAutoMessage() {
  return useMutation({
    mutationFn: (body: TelegramAutoMessagePreviewRequest) =>
      platformTelegramService.previewAutoMessage(body),
  });
}

export function useTestSendTelegramAutoMessage() {
  return useMutation({
    mutationFn: (body: TelegramAutoMessagePreviewRequest) =>
      platformTelegramService.testSendAutoMessage(body),
  });
}

export function usePlatformTelegramUsers(page = 1, enabled = true) {
  return useQuery({
    queryKey: platformTelegramKeys.users(page),
    queryFn: ({ signal }) => platformTelegramService.users(page, signal),
    enabled,
  });
}

export function usePlatformTelegramBroadcasts(page = 1, enabled = true) {
  return useQuery({
    queryKey: platformTelegramKeys.broadcasts(page),
    queryFn: ({ signal }) => platformTelegramService.broadcasts(page, signal),
    enabled,
  });
}

export function useCreateTelegramBroadcast() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTelegramBroadcastRequest) => platformTelegramService.createBroadcast(body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['platform-telegram-broadcasts'] });
      void client.invalidateQueries({ queryKey: platformTelegramKeys.status });
      void client.invalidateQueries({ queryKey: platformTelegramKeys.stats });
    },
  });
}

export function useCancelTelegramBroadcast() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => platformTelegramService.cancelBroadcast(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['platform-telegram-broadcasts'] });
    },
  });
}

export function useUploadTelegramMedia() {
  return useMutation({
    mutationFn: (file: File) => platformTelegramService.uploadMedia(file),
  });
}
