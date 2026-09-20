import type {
  PersonalDebtDirection,
  PersonalDebtStatus,
  PersonalEntryType,
  PersonalNotificationKind,
  PersonalNotificationSeverity,
  PersonalRecurringDueState,
  PersonalRecurringFrequency,
} from '../constants/enums.js';
import type { IsoDateString, Money } from './api.js';

export interface PersonalRecurringWalletRef {
  id: string;
  name: string;
}

export interface PersonalRecurringCategoryRef {
  id: string;
  name: string;
}

export interface PersonalRecurringRuleDto {
  id: string;
  name: string;
  type: PersonalEntryType;
  amountSom: Money;
  frequency: PersonalRecurringFrequency;
  intervalDays: number | null;
  dayOfMonth: number | null;
  nextDueAt: IsoDateString;
  dueState: PersonalRecurringDueState;
  note: string | null;
  isActive: boolean;
  wallet: PersonalRecurringWalletRef | null;
  category: PersonalRecurringCategoryRef | null;
  createdAt: IsoDateString;
}

export interface PersonalRecurringListResponse {
  items: PersonalRecurringRuleDto[];
  upcoming: PersonalRecurringRuleDto[];
}

export interface CreatePersonalRecurringRuleRequest {
  name: string;
  type: PersonalEntryType;
  amountSom: Money;
  frequency: PersonalRecurringFrequency;
  nextDueAt: string;
  intervalDays?: number | null;
  dayOfMonth?: number | null;
  walletId?: string | null;
  categoryId?: string | null;
  note?: string | null;
}

export interface UpdatePersonalRecurringRuleRequest {
  name?: string;
  amountSom?: Money;
  frequency?: PersonalRecurringFrequency;
  nextDueAt?: string;
  intervalDays?: number | null;
  dayOfMonth?: number | null;
  walletId?: string | null;
  categoryId?: string | null;
  note?: string | null;
  isActive?: boolean;
}

export interface PersonalDebtPaymentDto {
  id: string;
  amountSom: Money;
  occurredAt: IsoDateString;
  note: string | null;
  createdAt: IsoDateString;
}

export interface PersonalDebtDto {
  id: string;
  direction: PersonalDebtDirection;
  personName: string;
  principalSom: Money;
  paidSom: Money;
  remainingSom: Money;
  occurredAt: IsoDateString;
  dueAt: IsoDateString | null;
  note: string | null;
  status: PersonalDebtStatus;
  isArchived: boolean;
  payments: PersonalDebtPaymentDto[];
  createdAt: IsoDateString;
}

export interface PersonalDebtListResponse {
  items: PersonalDebtDto[];
  lentOutstandingSom: Money;
  borrowedOutstandingSom: Money;
}

export interface CreatePersonalDebtRequest {
  direction: PersonalDebtDirection;
  personName: string;
  principalSom: Money;
  occurredAt: string;
  dueAt?: string | null;
  note?: string | null;
}

export interface UpdatePersonalDebtRequest {
  personName?: string;
  dueAt?: string | null;
  note?: string | null;
  isArchived?: boolean;
}

export interface CreatePersonalDebtPaymentRequest {
  amountSom: Money;
  occurredAt: string;
  note?: string | null;
}

export interface PersonalNotificationPrefs {
  notifyBudget: boolean;
  notifyGoals: boolean;
  notifyRecurring: boolean;
  notifyDebts: boolean;
}

export interface PersonalNotificationDto {
  id: string;
  kind: PersonalNotificationKind;
  severity: PersonalNotificationSeverity;
  href: string;
  title: string;
  amountSom: Money | null;
  dueAt: IsoDateString | null;
}

export interface PersonalNotificationListResponse {
  items: PersonalNotificationDto[];
  prefs: PersonalNotificationPrefs;
  unreadCount: number;
}

export interface UpdatePersonalNotificationPrefsRequest {
  notifyBudget?: boolean;
  notifyGoals?: boolean;
  notifyRecurring?: boolean;
  notifyDebts?: boolean;
}
