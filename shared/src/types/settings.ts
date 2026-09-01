import type { IsoDateString } from './api.js';

/**
 * Store profile (Sozlamalar) API contract.
 *
 * Reads and updates the authenticated user's store only — `storeId` is never
 * accepted from the client. Currency stays display-only in the UI; timezone is
 * editable when it matches the server allowlist.
 */

/**
 * Exact phrase the administrator must type to authorise a factory reset.
 * Case-sensitive — same pattern as backup restore confirmation.
 */
export const STORE_RESET_CONFIRMATION = 'RESET';

export interface StoreProfile {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  updatedAt: IsoDateString;
}

export interface UpdateStoreProfileRequest {
  name?: string;
  phone?: string | null;
  address?: string | null;
  timezone?: string;
}

export interface StoreProfileResponse {
  store: StoreProfile;
}

export interface StoreProfileMutationResponse {
  store: StoreProfile;
}

export interface ResetStoreRequest {
  /** Must equal {@link STORE_RESET_CONFIRMATION} exactly. */
  confirmation: string;
}

/** Rows deleted per collection by a completed factory reset. */
export type ResetStoreDeletedCounts = Record<string, number>;

export interface ResetStoreResponse {
  deletedCounts: ResetStoreDeletedCounts;
  totalDeletedRows: number;
  /** Admin account that was kept so the session stays valid. */
  retainedUserId: string;
}
