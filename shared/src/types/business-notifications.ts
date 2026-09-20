import type {
  BusinessNotificationCategory,
  BusinessNotificationKind,
  PersonalNotificationSeverity,
} from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export interface BusinessNotificationPrefs {
  notifySales: boolean;
  notifyInventory: boolean;
  notifyDelivery: boolean;
  notifyAssembly: boolean;
  notifyWorkers: boolean;
  notifyBilling: boolean;
  notifyImportant: boolean;
}

export const DEFAULT_BUSINESS_NOTIFICATION_PREFS: BusinessNotificationPrefs = {
  notifySales: true,
  notifyInventory: true,
  notifyDelivery: true,
  notifyAssembly: true,
  notifyWorkers: true,
  notifyBilling: true,
  notifyImportant: true,
};

export interface BusinessNotificationDto {
  id: string;
  category: BusinessNotificationCategory;
  kind: BusinessNotificationKind;
  severity: PersonalNotificationSeverity;
  href: string;
  title: string;
  body: string | null;
  createdAt: IsoDateString | null;
  read: boolean;
}

export interface BusinessNotificationListResponse {
  items: BusinessNotificationDto[];
  prefs: BusinessNotificationPrefs;
  unreadCount: number;
}

export interface UpdateBusinessNotificationPrefsRequest {
  notifySales?: boolean;
  notifyInventory?: boolean;
  notifyDelivery?: boolean;
  notifyAssembly?: boolean;
  notifyWorkers?: boolean;
  notifyBilling?: boolean;
  notifyImportant?: boolean;
}

export interface MarkBusinessNotificationsReadRequest {
  keys?: string[];
}
