import type { UserRole } from '@furniture-erp/shared';

import i18n from '@/i18n';

/** How a role is named wherever the signed-in account is shown. */
export function roleLabel(role: UserRole): string {
  return i18n.t(`roles.${role}`);
}
