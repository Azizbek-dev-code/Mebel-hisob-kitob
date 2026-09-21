import type {
  CreateTelegramBroadcastRequest,
  TelegramAdminBotStatus,
  TelegramAdminConnectedUsersResponse,
  TelegramAdminStats,
  TelegramAutomationDto,
  TelegramAutoMessageDto,
  TelegramAutoMessagePreviewRequest,
  TelegramAutoMessagePreviewResponse,
  TelegramAutoMessageResultCatalogItem,
  TelegramAutoMessageTestSendResponse,
  TelegramBroadcastDetail,
  TelegramBroadcastListResponse,
  TelegramMediaUploadResponse,
  TelegramMenuScreenDto,
  TelegramStartMessageDto,
  UpdateTelegramAutomationRequest,
  UpdateTelegramBotTokenRequest,
  UpdateTelegramStartMessageRequest,
  UpsertTelegramAutoMessageRequest,
  UpsertTelegramMenuScreenRequest,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

export const platformTelegramService = {
  status(signal?: AbortSignal) {
    return apiClient.get<TelegramAdminBotStatus>('/telegram/admin/status', { signal });
  },
  stats(signal?: AbortSignal) {
    return apiClient.get<TelegramAdminStats>('/telegram/admin/stats', { signal });
  },
  updateToken(body: UpdateTelegramBotTokenRequest) {
    return apiClient.put<TelegramAdminBotStatus>('/telegram/admin/token', { body });
  },
  startMessage(signal?: AbortSignal) {
    return apiClient.get<TelegramStartMessageDto>('/telegram/admin/start-message', { signal });
  },
  updateStartMessage(body: UpdateTelegramStartMessageRequest) {
    return apiClient.put<TelegramStartMessageDto>('/telegram/admin/start-message', { body });
  },
  menu(signal?: AbortSignal) {
    return apiClient.get<TelegramMenuScreenDto[]>('/telegram/admin/menu', { signal });
  },
  updateMenuScreen(slug: string, body: UpsertTelegramMenuScreenRequest) {
    return apiClient.put<TelegramMenuScreenDto>(`/telegram/admin/menu/${slug}`, { body });
  },
  automations(signal?: AbortSignal) {
    return apiClient.get<TelegramAutomationDto[]>('/telegram/admin/automations', { signal });
  },
  updateAutomation(kind: string, body: UpdateTelegramAutomationRequest) {
    return apiClient.put<TelegramAutomationDto>(`/telegram/admin/automations/${kind}`, { body });
  },
  autoMessages(signal?: AbortSignal) {
    return apiClient.get<TelegramAutoMessageDto[]>('/telegram/admin/auto-messages', { signal });
  },
  autoMessageCatalog(accountType: string, signal?: AbortSignal) {
    return apiClient.get<TelegramAutoMessageResultCatalogItem[]>(
      '/telegram/admin/auto-messages/catalog',
      { signal, searchParams: { accountType } },
    );
  },
  createAutoMessage(body: UpsertTelegramAutoMessageRequest) {
    return apiClient.post<TelegramAutoMessageDto>('/telegram/admin/auto-messages', { body });
  },
  updateAutoMessage(id: string, body: UpsertTelegramAutoMessageRequest) {
    return apiClient.put<TelegramAutoMessageDto>(`/telegram/admin/auto-messages/${id}`, { body });
  },
  duplicateAutoMessage(id: string) {
    return apiClient.post<TelegramAutoMessageDto>(`/telegram/admin/auto-messages/${id}/duplicate`);
  },
  deleteAutoMessage(id: string) {
    return apiClient.delete<{ ok: boolean }>(`/telegram/admin/auto-messages/${id}`);
  },
  previewAutoMessage(body: TelegramAutoMessagePreviewRequest) {
    return apiClient.post<TelegramAutoMessagePreviewResponse>('/telegram/admin/auto-messages/preview', {
      body,
    });
  },
  testSendAutoMessage(body: TelegramAutoMessagePreviewRequest) {
    return apiClient.post<TelegramAutoMessageTestSendResponse>(
      '/telegram/admin/auto-messages/test-send',
      { body },
    );
  },
  users(page = 1, signal?: AbortSignal) {
    return apiClient.get<TelegramAdminConnectedUsersResponse>('/telegram/admin/users', {
      signal,
      searchParams: { page, pageSize: 20 },
    });
  },
  broadcasts(page = 1, signal?: AbortSignal) {
    return apiClient.get<TelegramBroadcastListResponse>('/telegram/admin/broadcasts', {
      signal,
      searchParams: { page, pageSize: 20 },
    });
  },
  createBroadcast(body: CreateTelegramBroadcastRequest) {
    return apiClient.post<TelegramBroadcastDetail>('/telegram/admin/broadcasts', { body });
  },
  cancelBroadcast(id: string) {
    return apiClient.post<TelegramBroadcastDetail>(`/telegram/admin/broadcasts/${id}/cancel`);
  },
  uploadMedia(file: File) {
    const body = new FormData();
    body.append('image', file);
    return apiClient.post<TelegramMediaUploadResponse>('/telegram/admin/media', { body });
  },
};
