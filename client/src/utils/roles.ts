import { UserRole } from '@furniture-erp/shared';

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.PLATFORM_ADMIN]: 'Platform administrator',
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.CASHIER]: 'Cashier',
  [UserRole.EMPLOYEE]: 'Employee',
};

/** How a role is named wherever the signed-in account is shown. */
export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}
