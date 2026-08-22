import type { PlatformShopListResponse } from '@furniture-erp/shared';

import { listShops } from './platform-billing.service.js';

/** Directory list — billing fields included. PLATFORM_ADMIN only. */
export async function listPlatformShops(actorRole: string): Promise<PlatformShopListResponse> {
  return listShops(actorRole);
}
