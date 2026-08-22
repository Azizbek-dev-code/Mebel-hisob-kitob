import type { UserRole, WorkerResponsibility, StoreAccessStatus, SubscriptionStatus } from '../constants/enums.js';
import type { IsoDateString } from './api.js';

/** Snapshot of the store's SaaS subscription, attached to /auth/me. */
export interface AuthSubscriptionSnapshot {
  status: SubscriptionStatus;
  storedStatus: SubscriptionStatus;
  planId: string | null;
  planName: string | null;
  trialEndsAt: IsoDateString | null;
  currentPeriodEnd: IsoDateString | null;
  trialWelcomeSeenAt: IsoDateString | null;
  daysRemaining: number | null;
  canWrite: boolean;
  hasPendingPaymentRequest: boolean;
  /** Enabled feature keys on the current plan. Empty + unrestricted means legacy "all allowed". */
  featureKeys: string[];
  /** True once the plan has PlanFeature rows. Empty keys then mean nothing is enabled. */
  featuresRestricted: boolean;
}

/** The authenticated principal as exposed to the client. Never contains secrets. */
export interface AuthUser {
  id: string;
  email: string;
  /** Short cash-desk login. Null for accounts that only ever sign in by email. */
  username: string | null;
  fullName: string;
  phone: string | null;
  role: UserRole;
  /** Business capabilities — independent of system role. */
  responsibilities: WorkerResponsibility[];
  storeId: string;
  storeName: string;
  /** Missing on older payloads is treated as ACTIVE. */
  storeAccessStatus?: StoreAccessStatus;
  subscription?: AuthSubscriptionSnapshot | null;
}

export interface LoginRequest {
  /** Username or email — whichever the operator remembers. */
  identifier: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
}

export interface CurrentUserResponse {
  user: AuthUser;
}

/**
 * Claims embedded in the access token. Kept minimal — role and store are re-read
 * from the database on every request, so a demotion takes effect immediately
 * instead of when the token expires.
 */
export interface AccessTokenPayload {
  sub: string;
  storeId: string;
  role: UserRole;
}
