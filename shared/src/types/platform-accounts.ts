import type { BusinessType, PlatformAccountDisplayStatus, PlatformAccountSource, WorkspaceType } from '../constants/enums.js';
import type { IsoDateString } from './api.js';
import type { PlatformInvoiceDto } from './platform.js';

export interface PlatformAccountRow {
  id: string;
  source: PlatformAccountSource;
  accountType: WorkspaceType;
  businessType: BusinessType | null;
  name: string;
  ownerName: string;
  ownerEmail: string | null;
  status: PlatformAccountDisplayStatus;
  planName: string | null;
  createdAt: IsoDateString;
  workspaceId: string | null;
  storeId: string | null;
  requestId: string | null;
}

export interface PlatformAccountSummary {
  total: number;
  active: number;
  trial: number;
  pending: number;
  expired: number;
  blocked: number;
  cancelled: number;
}

export interface PlatformAccountListQuery {
  accountType?: WorkspaceType;
  status?: PlatformAccountDisplayStatus;
  businessType?: BusinessType;
}

export interface PlatformAccountListResponse {
  items: PlatformAccountRow[];
  summary: PlatformAccountSummary;
  /** Distinct verticals present in the current type filter. Never padded with unused types. */
  businessTypes: BusinessType[];
}

export interface PlatformAccountSubscriptionDto {
  planName: string;
  status: PlatformAccountDisplayStatus;
  startedAt: IsoDateString | null;
  expiresAt: IsoDateString | null;
}

export interface PlatformAccountEventDto {
  label: string;
  at: IsoDateString;
}

export interface PlatformAccountDetailResponse {
  account: PlatformAccountRow;
  subscription: PlatformAccountSubscriptionDto | null;
  payments: PlatformInvoiceDto[];
  events: PlatformAccountEventDto[];
}
