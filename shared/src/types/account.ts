import type { AccountDeletionReasonCode } from '../constants/account-deletion.js';
import type { IsoDateString } from './api.js';

export interface DeleteAccountRequest {
  password: string;
  confirmation: 'DELETE MY ACCOUNT';
  reasonCode: AccountDeletionReasonCode;
  reasonDetail?: string;
}

export interface AccountDeletionItem {
  id: string;
  storeId: string | null;
  userId: string | null;
  emailSnapshot: string;
  usernameSnapshot: string | null;
  fullNameSnapshot: string;
  role: string;
  reasonCode: AccountDeletionReasonCode;
  reasonDetail: string | null;
  createdAt: IsoDateString;
}

export interface AccountDeletionListResponse {
  items: AccountDeletionItem[];
}
