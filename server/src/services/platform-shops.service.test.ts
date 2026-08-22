import { UserRole } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const { listShopsMock } = vi.hoisted(() => ({
  listShopsMock: vi.fn(),
}));

vi.mock('./platform-billing.service.js', () => ({
  listShops: listShopsMock,
}));

import { listPlatformShops } from './platform-shops.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listPlatformShops', () => {
  it('forbids store ADMIN', async () => {
    listShopsMock.mockRejectedValue(
      Object.assign(new ApiError(403, 'FORBIDDEN', 'forbidden'), { statusCode: 403 }),
    );
    await expect(listPlatformShops(UserRole.ADMIN)).rejects.toBeInstanceOf(ApiError);
    expect(listShopsMock).toHaveBeenCalledWith(UserRole.ADMIN);
  });

  it('returns billing-aware shops for PLATFORM_ADMIN', async () => {
    listShopsMock.mockResolvedValue({
      items: [
        {
          id: 'store_1',
          name: 'Mebel Savdo',
          phone: null,
          address: 'Samarqand',
          isActive: true,
          accessStatus: 'ACTIVE',
          planName: 'START',
          monthlyPrice: 150000,
          nextPaymentDue: '2026-09-22T00:00:00.000Z',
          hasPendingPayment: true,
          ownerName: 'Admin',
          ownerPhone: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    const result = await listPlatformShops(UserRole.PLATFORM_ADMIN);
    expect(result.items[0]?.planName).toBe('START');
    expect(result.items[0]?.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
