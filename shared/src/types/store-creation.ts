import type { StoreCreationRequestStatus } from '../constants/enums.js';
import type { IsoDateString } from './api.js';

/**
 * Public store-creation application.
 *
 * Never includes password, passwordHash, or any credential material.
 * The applicant is not a signed-in user until PLATFORM_ADMIN approves.
 */
export interface StoreCreationRequestPublic {
  id: string;
  applicantFirstName: string;
  applicantLastName: string;
  phone: string;
  email: string;
  username: string;
  storeName: string;
  region: string;
  district: string;
  address: string;
  status: StoreCreationRequestStatus;
  rejectionReason: string | null;
  reviewedAt: IsoDateString | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  /** Set only after approval. */
  createdStoreId: string | null;
}

/** Fields the platform inbox needs beyond the public status view. */
export interface StoreCreationRequestAdmin extends StoreCreationRequestPublic {
  reviewedById: string | null;
  reviewedByName: string | null;
}

export interface CreateStoreRequestBody {
  applicantFirstName: string;
  applicantLastName: string;
  phone: string;
  email: string;
  username: string;
  password: string;
  passwordConfirmation: string;
  storeName: string;
  region: string;
  district: string;
  address: string;
}

export interface CreateStoreRequestResponse {
  request: StoreCreationRequestPublic;
}

export interface StoreCreationRequestStatusResponse {
  request: StoreCreationRequestPublic;
}

export interface StoreCreationRequestListQuery {
  status?: StoreCreationRequestStatus;
  page?: number;
  pageSize?: number;
}

export interface StoreCreationRequestListResponse {
  items: StoreCreationRequestAdmin[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  pendingCount: number;
}

export interface StoreCreationRequestDetailResponse {
  request: StoreCreationRequestAdmin;
}

export interface ApproveStoreCreationResponse {
  request: StoreCreationRequestAdmin;
  store: {
    id: string;
    name: string;
    isActive: boolean;
  };
  owner: {
    id: string;
    email: string;
    username: string | null;
    fullName: string;
    role: 'ADMIN';
    storeId: string;
  };
}

export interface RejectStoreCreationBody {
  reason: string;
}

export interface RejectStoreCreationResponse {
  request: StoreCreationRequestAdmin;
}

export interface StoreCreationPendingSummary {
  pendingCount: number;
}
