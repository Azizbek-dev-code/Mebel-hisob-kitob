import {
  BusinessNotificationKind,
  FulfilmentStatus,
  ProductStatus,
  SaleStatus,
  UserRole,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, getStoreSubscription } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), updateMany: vi.fn() },
    sale: { findMany: vi.fn() },
    product: { findMany: vi.fn() },
    assemblyTask: { findMany: vi.fn() },
    workerFinancialTransaction: { findMany: vi.fn() },
  },
  getStoreSubscription: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('./store-billing.service.js', () => ({ getStoreSubscription }));

const { listBusinessNotifications } = await import('./business-notifications.service.js');

const STORE = 'store_a';
const ACTOR = {
  id: 'user_admin',
  role: UserRole.ADMIN,
  responsibilities: [] as string[],
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findFirst.mockResolvedValue({ bizNotifyPrefs: null, bizNotifyReads: [] });
  prismaMock.sale.findMany.mockResolvedValue([]);
  prismaMock.product.findMany.mockResolvedValue([]);
  prismaMock.assemblyTask.findMany.mockResolvedValue([]);
  prismaMock.workerFinancialTransaction.findMany.mockResolvedValue([]);
  getStoreSubscription.mockResolvedValue(null);
});

describe('listBusinessNotifications', () => {
  it('returns store-scoped sales alerts and never queries another store', async () => {
    prismaMock.sale.findMany.mockImplementation(async (args: { where?: { deliveryStatus?: unknown } }) => {
      if (args.where?.deliveryStatus) return [];
      return [
        {
          id: 'sale_1',
          saleNumber: 12,
          status: SaleStatus.ACTIVE,
          createdAt: new Date(),
          cancelledAt: null,
          customer: { firstName: 'Ali', lastName: 'Valiyev' },
        },
      ];
    });

    const result = await listBusinessNotifications(STORE, ACTOR, prismaMock as never);
    expect(result.items.some((item) => item.kind === BusinessNotificationKind.SALE_NEW)).toBe(true);
    expect(prismaMock.sale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: STORE }),
      }),
    );
    expect(JSON.stringify(result.items)).not.toContain('store_b');
  });

  it('hides sales alerts when the preference is off', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      bizNotifyPrefs: { notifySales: false },
      bizNotifyReads: [],
    });
    const result = await listBusinessNotifications(STORE, ACTOR, prismaMock as never);
    expect(result.items.every((item) => item.category !== 'SALES')).toBe(true);
  });

  it('does not leak inventory alerts to a delivery worker', async () => {
    const result = await listBusinessNotifications(STORE, {
      id: 'shopir_1',
      role: UserRole.EMPLOYEE,
      responsibilities: [WorkerResponsibility.DELIVERY],
    }, prismaMock as never);
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
    expect(result.items.every((item) => item.category !== 'INVENTORY')).toBe(true);
  });

  it('marks matching keys as read', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      bizNotifyPrefs: null,
      bizNotifyReads: ['stock-low:p1'],
    });
    prismaMock.product.findMany.mockResolvedValue([
      {
        id: 'p1',
        name: 'Divan',
        stockQty: 1,
        minStockQty: 3,
        updatedAt: new Date(),
        status: ProductStatus.ACTIVE,
      },
    ]);
    const result = await listBusinessNotifications(STORE, ACTOR, prismaMock as never);
    const stock = result.items.find((item) => item.id === 'stock-low:p1');
    expect(stock?.read).toBe(true);
    expect(result.unreadCount).toBe(0);
  });

  it('returns empty when the user is not in the store', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    const result = await listBusinessNotifications(STORE, ACTOR, prismaMock as never);
    expect(result.items).toEqual([]);
    expect(prismaMock.sale.findMany).not.toHaveBeenCalled();
  });

  it('includes overdue deliveries for delivery workers', async () => {
    prismaMock.sale.findMany.mockImplementation(async (args: { where?: { deliveryStatus?: unknown } }) => {
      if (!args.where?.deliveryStatus) return [];
      return [
        {
          id: 'sale_d',
          saleNumber: 9,
          deliveryDueDate: new Date(Date.now() - 86_400_000),
          createdAt: new Date(),
          deliveryPerson: { fullName: 'Azizbek' },
        },
      ];
    });
    const result = await listBusinessNotifications(
      STORE,
      { id: 'shopir_1', role: UserRole.EMPLOYEE, responsibilities: [WorkerResponsibility.DELIVERY] },
      prismaMock as never,
    );
    expect(result.items[0]?.kind).toBe(BusinessNotificationKind.DELIVERY_OVERDUE);
    expect(result.items[0]?.href).toBe('/delivery');
    expect(prismaMock.sale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          storeId: STORE,
          deliveryStatus: {
            in: [FulfilmentStatus.PENDING, FulfilmentStatus.SCHEDULED, FulfilmentStatus.IN_TRANSIT],
          },
        }),
      }),
    );
  });
});
