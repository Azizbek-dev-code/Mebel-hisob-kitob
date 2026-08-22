import type { AuthUser } from '@furniture-erp/shared';
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
