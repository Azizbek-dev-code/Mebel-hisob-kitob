import type {
  BusinessType,
  UserRole,
  WorkerResponsibility,
  StoreAccessStatus,
  SubscriptionStatus,
} from '../constants/enums.js';
import type { WorkspaceMembershipRole } from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export const AuthSessionKind = {
  STORE: 'STORE',
  PERSONAL: 'PERSONAL',
} as const;
export type AuthSessionKind = (typeof AuthSessionKind)[keyof typeof AuthSessionKind];

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
  /** Store vertical. Missing on older payloads is treated as FURNITURE. */
  businessType?: BusinessType;
  /** Missing on older payloads is treated as ACTIVE. */
  storeAccessStatus?: StoreAccessStatus;
  subscription?: AuthSubscriptionSnapshot | null;
}

/**
 * Personal Finance principal. Separate from `AuthUser` so store ERP code can keep
 * treating `storeId` as a required string. Only present when `kind === 'PERSONAL'`.
 */
export interface PersonalAuthUser {
  kind: 'PERSONAL';
  id: string;
  email: string;
  username: null;
  fullName: string;
  phone: null;
  /** Not a store `UserRole`. ERP permission helpers must treat this as non-admin. */
  role: 'PERSONAL';
  responsibilities: [];
  storeId: null;
  storeName: string;
  workspaceId: string;
  identityId: string;
  membershipRole: WorkspaceMembershipRole;
  subscription: AuthSubscriptionSnapshot;
}

export type AuthPrincipal = AuthUser | PersonalAuthUser;

export function isPersonalAuth(
  user: AuthPrincipal | null | undefined,
): user is PersonalAuthUser {
  return Boolean(user && 'kind' in user && user.kind === AuthSessionKind.PERSONAL);
}

/** Platform Admin is a role, not an account row in the switcher. */
export function isPlatformAdminAuth(user: AuthPrincipal | null | undefined): user is AuthUser {
  return Boolean(user && !isPersonalAuth(user) && user.role === 'PLATFORM_ADMIN');
}

export function homePathForAuth(user: AuthPrincipal): '/personal/dashboard' | '/dashboard' {
  return isPersonalAuth(user) ? '/personal/dashboard' : '/dashboard';
}

export interface LoginRequest {
  /** Username or email — whichever the operator remembers. */
  identifier: string;
  password: string;
}

export interface LoginResponse {
  user: AuthPrincipal;
}

export interface CurrentUserResponse {
  user: AuthPrincipal;
}

/**
 * Claims embedded in the access token. Kept minimal — role and store are re-read
 * from the database on every request, so a demotion takes effect immediately
 * instead of when the token expires.
 *
 * Legacy store tokens omit `ctx` and always carry `storeId` + `role`.
 * Personal tokens set `ctx: 'PERSONAL'` and never include `storeId`.
 */
export type AccessTokenPayload =
  | {
      sub: string;
      storeId: string;
      role: UserRole;
      ctx?: typeof AuthSessionKind.STORE;
      workspaceId?: never;
    }
  | {
      sub: string;
      ctx: typeof AuthSessionKind.PERSONAL;
      workspaceId: string;
      storeId?: never;
      role?: never;
    };
