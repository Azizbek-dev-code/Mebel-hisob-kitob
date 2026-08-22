import type { IsoDateString } from './api.js';

/**
 * Store profile (Sozlamalar) API contract.
 *
 * Reads and updates the authenticated user's store only — `storeId` is never
 * accepted from the client. Currency stays display-only in the UI; timezone is
 * editable when it matches the server allowlist.
 */

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
