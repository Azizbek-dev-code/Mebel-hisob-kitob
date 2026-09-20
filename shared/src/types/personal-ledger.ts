import type {
  PersonalCategoryKind,
  PersonalEntryType,
  PersonalHistoryKind,
  PersonalWalletKind,
} from '../constants/enums.js';
import type { ExpenseStatus } from '../constants/enums.js';
import type { IsoDateString, Money, PaginatedResult, PaginationMeta } from './api.js';

export interface PersonalWalletDto {
  id: string;
  name: string;
  kind: PersonalWalletKind;
  openingBalanceSom: Money;
  balanceSom: Money;
  sortOrder: number;
  isArchived: boolean;
}

export interface PersonalCategoryDto {
  id: string;
  kind: PersonalCategoryKind;
  key: string | null;
  name: string;
  color: string;
  icon: string | null;
  iconName?: string | null;
  iconColor?: string | null;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface PersonalEntryDto {
  id: string;
  type: PersonalEntryType;
  amount: Money;
  occurredAt: IsoDateString;
  note: string | null;
  status: ExpenseStatus;
  wallet: Pick<PersonalWalletDto, 'id' | 'name' | 'kind'>;
  category: Pick<PersonalCategoryDto, 'id' | 'name' | 'color' | 'kind'>;
  createdAt: IsoDateString;
}

export interface PersonalTransferDto {
  id: string;
  amount: Money;
  occurredAt: IsoDateString;
  note: string | null;
  status: ExpenseStatus;
  fromWallet: Pick<PersonalWalletDto, 'id' | 'name' | 'kind'>;
  toWallet: Pick<PersonalWalletDto, 'id' | 'name' | 'kind'>;
  createdAt: IsoDateString;
}

export type PersonalActivityItem =
  | { kind: 'ENTRY'; occurredAt: IsoDateString; createdAt: IsoDateString; entry: PersonalEntryDto }
  | { kind: 'TRANSFER'; occurredAt: IsoDateString; createdAt: IsoDateString; transfer: PersonalTransferDto };

export interface PersonalSummaryResponse {
  totalBalanceSom: Money;
  monthIncomeSom: Money;
  monthExpenseSom: Money;
  monthNetSom: Money;
  wallets: PersonalWalletDto[];
  recentEntries: PersonalEntryDto[];
  recentActivity: PersonalActivityItem[];
}

export interface PersonalWalletListResponse {
  items: PersonalWalletDto[];
}

export interface PersonalCategoryListResponse {
  items: PersonalCategoryDto[];
}

export interface CreatePersonalWalletRequest {
  name: string;
  kind: PersonalWalletKind;
  openingBalanceSom?: Money;
}

export interface UpdatePersonalWalletRequest {
  name?: string;
  kind?: PersonalWalletKind;
  openingBalanceSom?: Money;
  isArchived?: boolean;
}

export interface CreatePersonalCategoryRequest {
  kind: PersonalCategoryKind;
  name: string;
  color?: string;
  icon?: string;
  iconName?: string | null;
  iconColor?: string | null;
  parentId?: string | null;
}

export interface UpdatePersonalCategoryRequest {
  name?: string;
  color?: string;
  icon?: string;
  iconName?: string | null;
  iconColor?: string | null;
  parentId?: string | null;
  isActive?: boolean;
}

export interface CreatePersonalEntryRequest {
  type: PersonalEntryType;
  walletId: string;
  categoryId: string;
  amount: Money;
  occurredAt: string;
  note?: string | null;
}

export interface UpdatePersonalEntryRequest {
  walletId?: string;
  categoryId?: string;
  amount?: Money;
  occurredAt?: string;
  note?: string | null;
}

export interface PersonalEntryListQuery {
  type?: PersonalEntryType;
  status?: ExpenseStatus | 'ALL';
  walletId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export type PersonalEntryListResponse = PaginatedResult<PersonalEntryDto>;

export interface CreatePersonalTransferRequest {
  fromWalletId: string;
  toWalletId: string;
  amount: Money;
  occurredAt: string;
  note?: string | null;
}

export interface PersonalTransferListQuery {
  status?: ExpenseStatus | 'ALL';
  walletId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export type PersonalTransferListResponse = PaginatedResult<PersonalTransferDto>;

export interface PersonalHistoryListQuery {
  kind?: PersonalHistoryKind;
  walletId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface PersonalHistoryTotals {
  incomeSom: Money;
  expenseSom: Money;
  netSom: Money;
  transferSom: Money;
}

export interface PersonalHistoryResponse {
  items: PersonalActivityItem[];
  totals: PersonalHistoryTotals;
  meta: PaginationMeta;
}

