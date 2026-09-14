import type { AuthUser, PersonalAuthUser } from '@furniture-erp/shared';
import { UserRole, WorkerResponsibility } from '@furniture-erp/shared';

/** Shared signed-in fixtures for client tests. */
export const TEST_ADMIN: AuthUser = {
  id: 'user_admin',
  email: 'admin@furniture-erp.local',
  username: 'admin',
  fullName: 'Store Administrator',
  phone: null,
  role: UserRole.ADMIN,
  responsibilities: [
    WorkerResponsibility.SELLER,
    WorkerResponsibility.ASSEMBLER,
    WorkerResponsibility.DELIVERY,
  ],
  storeId: 'store_1',
  storeName: 'Mebel Savdo',
};

export const TEST_PLATFORM_ADMIN: AuthUser = {
  id: 'user_platform',
  email: 'platform@furniture-erp.local',
  username: 'platform',
  fullName: 'Platform Administrator',
  phone: null,
  role: UserRole.PLATFORM_ADMIN,
  responsibilities: [],
  storeId: 'store_1',
  storeName: 'Mebel Savdo',
};

export const TEST_CASHIER: AuthUser = {
  id: 'user_cashier',
  email: 'cashier@furniture-erp.local',
  username: 'cashier',
  fullName: 'Vali Sotuvchi',
  phone: '+998901234567',
  role: UserRole.CASHIER,
  responsibilities: [WorkerResponsibility.SELLER],
  storeId: 'store_1',
  storeName: 'Mebel Savdo',
};

export const TEST_EMPLOYEE: AuthUser = {
  id: 'user_ali',
  email: 'ali@furniture-erp.local',
  username: 'ali',
  fullName: 'Ali Usta',
  phone: '+998901111111',
  role: UserRole.EMPLOYEE,
  responsibilities: [WorkerResponsibility.ASSEMBLER, WorkerResponsibility.SELLER],
  storeId: 'store_1',
  storeName: 'Mebel Savdo',
};

export const TEST_PERSONAL: PersonalAuthUser = {
  kind: 'PERSONAL',
  id: 'idn_1',
  email: 'aziz@example.com',
  username: null,
  fullName: 'Aziz Karimov',
  phone: null,
  role: 'PERSONAL',
  responsibilities: [],
  storeId: null,
  storeName: 'Azizning shaxsiy moliyasi',
  workspaceId: 'ws_1',
  identityId: 'idn_1',
  membershipRole: 'OWNER',
  subscription: {
    status: 'TRIAL',
    storedStatus: 'TRIAL',
    planId: 'PERSONAL_TRIAL',
    planName: 'Sinov',
    trialEndsAt: '2026-09-20T00:00:00.000Z',
    currentPeriodEnd: '2026-09-20T00:00:00.000Z',
    trialWelcomeSeenAt: null,
    daysRemaining: 7,
    canWrite: true,
    hasPendingPaymentRequest: false,
    featureKeys: [],
    featuresRestricted: false,
  },
};
