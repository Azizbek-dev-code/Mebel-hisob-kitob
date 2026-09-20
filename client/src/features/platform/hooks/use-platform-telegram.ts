import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateTelegramBroadcastRequest,
  UpdateTelegramAutomationRequest,
  UpdateTelegramBotTokenRequest,
  UpdateTelegramStartMessageRequest,
  UpsertTelegramMenuScreenRequest,
} from '@furniture-erp/shared';

import { platformTelegramService } from '@/services/platform-telegram.service';

export const platformTelegramKeys = {
  status: ['platform-telegram-status'] as const,
  stats: ['platform-telegram-stats'] as const,
  start: ['platform-telegram-start'] as const,
  menu: ['platform-telegram-menu'] as const,
  automations: ['platform-telegram-automations'] as const,
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
