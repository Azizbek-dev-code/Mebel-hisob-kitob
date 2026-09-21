import type { IsoDateString, PaginatedResult } from './api.js';

export interface TelegramAccountPref {
  workspaceId: string;
  type: 'PERSONAL' | 'BUSINESS';
  name: string;
  storeId: string | null;
  businessType: string | null;
  notifyEnabled: boolean;
}

export interface TelegramConnectionStatus {
  connected: boolean;
  username: string | null;
  firstName: string | null;
  connectedAt: IsoDateString | null;
  notifyBusiness: boolean;
  notifyPersonal: boolean;
  bizNotifySales: boolean;
  bizNotifyInventory: boolean;
  bizNotifyDelivery: boolean;
  bizNotifyAssembly: boolean;
  bizNotifyWorkers: boolean;
  bizNotifyBilling: boolean;
  bizNotifyImportant: boolean;
  personalNotifyBudget: boolean;
  personalNotifyGoals: boolean;
  personalNotifyRecurring: boolean;
  personalNotifyDebts: boolean;
  notifyDailySummaryBusiness: boolean;
  notifyDailySummaryPersonal: boolean;
  notifyWeeklySummaryBusiness: boolean;
  notifyWeeklySummaryPersonal: boolean;
  notifyMonthlySummaryBusiness: boolean;
  notifyMonthlySummaryPersonal: boolean;
  accounts: TelegramAccountPref[];
}

export interface TelegramLinkStartResponse {
  deepLink: string;
  expiresAt: IsoDateString;
}

export interface UpdateTelegramAccountPrefRequest {
  workspaceId: string;
  notifyEnabled: boolean;
}

export interface UpdateTelegramPrefsRequest {
  notifyBusiness?: boolean;
  notifyPersonal?: boolean;
  bizNotifySales?: boolean;
  bizNotifyInventory?: boolean;
  bizNotifyDelivery?: boolean;
  bizNotifyAssembly?: boolean;
  bizNotifyWorkers?: boolean;
  bizNotifyBilling?: boolean;
  bizNotifyImportant?: boolean;
  personalNotifyBudget?: boolean;
  personalNotifyGoals?: boolean;
  personalNotifyRecurring?: boolean;
  personalNotifyDebts?: boolean;
  notifyDailySummaryBusiness?: boolean;
  notifyDailySummaryPersonal?: boolean;
  notifyWeeklySummaryBusiness?: boolean;
  notifyWeeklySummaryPersonal?: boolean;
  notifyMonthlySummaryBusiness?: boolean;
  notifyMonthlySummaryPersonal?: boolean;
  accountPrefs?: UpdateTelegramAccountPrefRequest[];
}

export const TelegramMediaKind = {
  NONE: 'NONE',
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
} as const;
export type TelegramMediaKind = (typeof TelegramMediaKind)[keyof typeof TelegramMediaKind];

export const TelegramBroadcastStatus = {
  PENDING: 'PENDING',
  SENDING: 'SENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  CANCELLED: 'CANCELLED',
} as const;
export type TelegramBroadcastStatus =
  (typeof TelegramBroadcastStatus)[keyof typeof TelegramBroadcastStatus];

export const TelegramBroadcastRecipientStatus = {
  PENDING: 'PENDING',
  SENDING: 'SENDING',
  FAILED: 'FAILED',
  SENT: 'SENT',
  SKIPPED: 'SKIPPED',
} as const;
export type TelegramBroadcastRecipientStatus =
  (typeof TelegramBroadcastRecipientStatus)[keyof typeof TelegramBroadcastRecipientStatus];

export const TelegramBroadcastAudience = {
  ALL: 'ALL',
  PERSONAL: 'PERSONAL',
  BUSINESS: 'BUSINESS',
  PERSONAL_AND_BUSINESS: 'PERSONAL_AND_BUSINESS',
} as const;
export type TelegramBroadcastAudience =
  (typeof TelegramBroadcastAudience)[keyof typeof TelegramBroadcastAudience];

export const TelegramMenuButtonAction = {
  URL: 'URL',
  MENU: 'MENU',
  BACK: 'BACK',
} as const;
export type TelegramMenuButtonAction =
  (typeof TelegramMenuButtonAction)[keyof typeof TelegramMenuButtonAction];

export const TelegramAutomationKind = {
  PERSONAL_MORNING: 'PERSONAL_MORNING',
  PERSONAL_EVENING: 'PERSONAL_EVENING',
  PERSONAL_WEEKLY: 'PERSONAL_WEEKLY',
  PERSONAL_MONTHLY: 'PERSONAL_MONTHLY',
  BUSINESS_MORNING: 'BUSINESS_MORNING',
  BUSINESS_EVENING: 'BUSINESS_EVENING',
  BUSINESS_WEEKLY: 'BUSINESS_WEEKLY',
  BUSINESS_MONTHLY: 'BUSINESS_MONTHLY',
} as const;
export type TelegramAutomationKind =
  (typeof TelegramAutomationKind)[keyof typeof TelegramAutomationKind];

export const TelegramTokenSource = {
  NONE: 'none',
  ENV: 'env',
  DATABASE: 'database',
} as const;
export type TelegramTokenSource = (typeof TelegramTokenSource)[keyof typeof TelegramTokenSource];

export const TelegramCtaKind = {
  DETAIL: 'DETAIL',
  SUMMARY: 'SUMMARY',
  SYSTEM: 'SYSTEM',
} as const;
export type TelegramCtaKind = (typeof TelegramCtaKind)[keyof typeof TelegramCtaKind];

export interface TelegramRichContent {
  text: string;
  mediaKind: TelegramMediaKind;
  imageUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
}

export interface TelegramMenuButtonDto {
  id?: string;
  text: string;
  action: TelegramMenuButtonAction;
  url: string | null;
  targetSlug: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface TelegramStartButtonDto {
  text: string;
  action: TelegramMenuButtonAction;
  url?: string | null;
  targetSlug?: string | null;
}

export interface TelegramWebhookAdminStatus {
  url: string;
  configuredUrl: string;
  active: boolean;
  pendingUpdateCount: number;
  lastErrorMessage: string | null;
  lastCheckedAt: IsoDateString;
}

export interface TelegramAdminBotStatus {
  connected: boolean;
  botUsername: string | null;
  botFirstName: string | null;
  tokenConfigured: boolean;
  tokenSource: TelegramTokenSource;
  hasDatabaseToken: boolean;
  webhook: TelegramWebhookAdminStatus | null;
  connectedUsers: number;
  lastValidatedAt: IsoDateString | null;
}

export interface UpdateTelegramBotTokenRequest {
  token: string;
}

export interface TelegramStartMessageDto extends TelegramRichContent {
  id: string;
  updatedAt: IsoDateString;
  buttons: TelegramStartButtonDto[];
}

export type UpdateTelegramStartMessageRequest = TelegramRichContent & {
  buttons?: TelegramStartButtonDto[];
};

export interface TelegramMenuScreenDto {
  id: string;
  slug: string;
  title: string;
  text: string;
  mediaKind: TelegramMediaKind;
  imageUrl: string | null;
  categoryKey: string | null;
  isActive: boolean;
  sortOrder: number;
  updatedAt: IsoDateString;
  buttons: TelegramMenuButtonDto[];
}

export interface UpsertTelegramMenuScreenRequest {
  slug?: string;
  title: string;
  text: string;
  imageUrl?: string | null;
  categoryKey?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  buttons: TelegramMenuButtonDto[];
}

export interface TelegramAdminConnectedUser {
  id: string;
  username: string | null;
  firstName: string | null;
  identityName: string;
  identityEmail: string;
  connectedAt: IsoDateString;
}

export type TelegramAdminConnectedUsersResponse = PaginatedResult<TelegramAdminConnectedUser>;

export interface CreateTelegramBroadcastRequest extends TelegramRichContent {
  name?: string | null;
  audience?: TelegramBroadcastAudience;
  audienceFilter?: Record<string, unknown> | null;
  timezone?: string;
  scheduledAt?: IsoDateString | null;
  sendNow?: boolean;
}

export interface TelegramBroadcastSummary {
  id: string;
  title: string | null;
  name: string | null;
  preview: string;
  status: TelegramBroadcastStatus;
  audience: TelegramBroadcastAudience;
  timezone: string;
  scheduledAt: IsoDateString | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: IsoDateString;
  completedAt: IsoDateString | null;
}

export interface TelegramBroadcastDetail extends TelegramBroadcastSummary, TelegramRichContent {}

export type TelegramBroadcastListResponse = PaginatedResult<TelegramBroadcastSummary>;

export interface TelegramMediaUploadResponse {
  url: string;
}

export interface TelegramAutomationDto {
  id: string;
  kind: TelegramAutomationKind;
  enabled: boolean;
  hour: number;
  minute: number;
  timezone: string;
  weekday: number | null;
  monthDay: number | null;
  messageTemplate: string | null;
  ctaLabel: string | null;
  ctaPath: string | null;
  lastRunAt: IsoDateString | null;
  lastRunLocalKey: string | null;
  updatedAt: IsoDateString;
}

export interface UpdateTelegramAutomationRequest {
  enabled?: boolean;
  hour?: number;
  minute?: number;
  timezone?: string;
  weekday?: number | null;
  monthDay?: number | null;
  messageTemplate?: string | null;
  ctaLabel?: string | null;
  ctaPath?: string | null;
}

/** Universal Auto Message account scope. */
export const TelegramAutoMessageAccountType = {
  PERSONAL: 'PERSONAL',
  BUSINESS: 'BUSINESS',
} as const;
export type TelegramAutoMessageAccountType =
  (typeof TelegramAutoMessageAccountType)[keyof typeof TelegramAutoMessageAccountType];

export const TelegramAutoMessageRecurrence = {
  EVERY_DAY: 'EVERY_DAY',
  EVERY_WEEK: 'EVERY_WEEK',
  EVERY_MONTH: 'EVERY_MONTH',
  EVERY_15_DAYS: 'EVERY_15_DAYS',
  ONE_TIME: 'ONE_TIME',
} as const;
export type TelegramAutoMessageRecurrence =
  (typeof TelegramAutoMessageRecurrence)[keyof typeof TelegramAutoMessageRecurrence];

export interface TelegramAutoMessageThresholdConfig {
  /** Which selected result key drives HIGH/MEDIUM/LOW messages. */
  resultKey: string;
  high?: number | null;
  medium?: number | null;
  low?: number | null;
  highMessage?: string | null;
  mediumMessage?: string | null;
  lowMessage?: string | null;
}

export interface TelegramAutoMessageResultCatalogItem {
  key: string;
  label: string;
  description: string;
  accountType: TelegramAutoMessageAccountType;
  dataType: 'money' | 'count' | 'percent' | 'duration' | 'text';
}

export interface TelegramAutoMessageDto {
  id: string;
  title: string;
  accountType: TelegramAutoMessageAccountType;
  enabled: boolean;
  recurrence: TelegramAutoMessageRecurrence;
  hour: number;
  minute: number;
  timezone: string;
  weekday: number | null;
  monthDay: number | null;
  startDate: string | null;
  messageBody: string;
  resultKeys: string[];
  thresholdConfig: TelegramAutoMessageThresholdConfig | null;
  ctaEnabled: boolean;
  ctaLabel: string | null;
  ctaPath: string | null;
  legacyKind: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface UpsertTelegramAutoMessageRequest {
  title: string;
  accountType: TelegramAutoMessageAccountType;
  enabled?: boolean;
  recurrence: TelegramAutoMessageRecurrence;
  hour: number;
  minute: number;
  timezone?: string;
  weekday?: number | null;
  monthDay?: number | null;
  startDate?: string | null;
  messageBody: string;
  resultKeys: string[];
  thresholdConfig?: TelegramAutoMessageThresholdConfig | null;
  ctaEnabled?: boolean;
  ctaLabel?: string | null;
  ctaPath?: string | null;
}

export interface TelegramAutoMessagePreviewRequest {
  title?: string;
  accountType: TelegramAutoMessageAccountType;
  messageBody: string;
  resultKeys: string[];
  thresholdConfig?: TelegramAutoMessageThresholdConfig | null;
  ctaEnabled?: boolean;
  ctaLabel?: string | null;
  ctaPath?: string | null;
}

export interface TelegramAutoMessagePreviewResponse {
  preview: true;
  text: string;
  unresolvedPlaceholders: string[];
  ctaLabel: string | null;
  ctaPath: string | null;
}

export interface TelegramAutoMessageTestSendResponse {
  sent: boolean;
  reason?: 'not_connected' | 'send_failed';
  message?: string;
}

export interface TelegramAdminStats {
  connectedUsers: number;
  inactiveUsers: number;
  personalConnected: number;
  businessConnected: number;
  bothConnected: number;
  broadcastsTotal: number;
  broadcastsScheduled: number;
  lastBroadcastAt: IsoDateString | null;
  automationsEnabled: number;
}
