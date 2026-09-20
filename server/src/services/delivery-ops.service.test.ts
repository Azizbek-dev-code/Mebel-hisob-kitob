import {
  FulfilmentStatus,
  SaleStatus,
  UserRole,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  financialRepoMock,
  workerRepoMock,
  saleServiceMock,
  feesMock,
} = vi.hoisted(() => ({
  prismaMock: {
    sale: { findMany: vi.fn(), findFirst: vi.fn() },
    purchase: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    workerFinancialTransaction: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
  financialRepoMock: {
    findOpenCommissionByRef: vi.fn(),
    aggregateWorkerTotals: vi.fn(),
  },
  workerRepoMock: {
    findActiveWorkerWithResponsibility: vi.fn(),
    workerHasResponsibility: vi.fn(),
    findActiveWorkerInStore: vi.fn(),
  },
  saleServiceMock: {
    getSale: vi.fn(),
    updateSale: vi.fn(),
  },
  feesMock: {
    DELIVERY_FEE_REF: (id: string) => `${id}:DELIVERY_FEE`,
    PURCHASE_DRIVER_FEE_REF: (id: string) => `${id}:DRIVER_FEE`,
    postPurchaseDriverFee: vi.fn(async () => true),
  },
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../repositories/worker-financial.repository.js', () => financialRepoMock);
vi.mock('../repositories/worker.repository.js', () => workerRepoMock);
vi.mock('./sale.service.js', () => saleServiceMock);
vi.mock('./worker-operational-fees.service.js', () => feesMock);

const { listMyDeliveries, updateMySaleDeliveryStatus, updateMyPurchaseDeliveryStatus } = await import(
  './delivery-ops.service.js'
);

const STORE = 'store_1';
const SHOPIR = 'shopir_1';
const OTHER = 'other_1';

beforeEach(() => {
  vi.clearAllMocks();
  workerRepoMock.findActiveWorkerWithResponsibility.mockResolvedValue({ id: SHOPIR });
  workerRepoMock.workerHasResponsibility.mockResolvedValue(true);
  workerRepoMock.findActiveWorkerInStore.mockResolvedValue({ id: SHOPIR, isActive: true });
  financialRepoMock.aggregateWorkerTotals.mockResolvedValue({
    totalBonuses: 0,
    totalCommissions: 150_000,
    totalAdvances: 0,
    totalDebt: 0,
    totalPayments: 0,
    totalAdjustments: 0,
    totalReversals: 0,
    netFinancialPosition: 150_000,
    reversalsByOriginalType: {},
  });
  financialRepoMock.findOpenCommissionByRef.mockResolvedValue(null);
  prismaMock.workerFinancialTransaction.findFirst.mockResolvedValue(null);
  prismaMock.purchase.findMany.mockResolvedValue([]);
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) =>
    fn(prismaMock),
  );
  feesMock.postPurchaseDriverFee.mockResolvedValue(true);
});

describe('delivery-ops.service', () => {
  it('lists store-wide sale deliveries with assignee names', async () => {
    prismaMock.sale.findMany.mockResolvedValue([
      {
        id: 'sale_1',
        saleNumber: 11,
        saleDate: new Date(),
        deliveryStatus: FulfilmentStatus.SCHEDULED,
        deliveryCost: 150_000n,
        deliveryDate: null,
        deliveryDueDate: new Date(),
        deliveryAddress: 'Test',
        deliveryPersonId: SHOPIR,
        deliveryPerson: { id: SHOPIR, fullName: 'Azizbek' },
        customer: { firstName: 'A', lastName: 'B', phone: '+99890' },
      },
      {
        id: 'sale_2',
        saleNumber: 12,
        saleDate: new Date(),
        deliveryStatus: FulfilmentStatus.PENDING,
        deliveryCost: 80_000n,
        deliveryDate: null,
        deliveryDueDate: new Date(),
        deliveryAddress: 'Boshqa',
        deliveryPersonId: OTHER,
        deliveryPerson: { id: OTHER, fullName: 'Ali' },
        customer: { firstName: 'C', lastName: 'D', phone: '+99891' },
      },
    ]);

    const result = await listMyDeliveries(STORE, { id: SHOPIR, role: UserRole.EMPLOYEE });
    expect(prismaMock.sale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: STORE, deliveryStatus: { not: FulfilmentStatus.NOT_REQUIRED } },
      }),
    );
    expect(result.saleDeliveries).toHaveLength(2);
    expect(result.saleDeliveries[0]?.assigneeName).toBe('Azizbek');
    expect(result.saleDeliveries[0]?.canStart).toBe(true);
    expect(result.saleDeliveries[1]?.assigneeName).toBe('Ali');
    expect(result.saleDeliveries[1]?.canStart).toBe(false);
    expect(result.kpis.todayPending).toBeGreaterThanOrEqual(1);
  });

  it('forbids listing without DELIVERY responsibility', async () => {
    workerRepoMock.findActiveWorkerWithResponsibility.mockResolvedValue(null);
    await expect(listMyDeliveries(STORE, { id: SHOPIR, role: UserRole.EMPLOYEE })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('lets store admins list deliveries without DELIVERY responsibility', async () => {
    workerRepoMock.findActiveWorkerWithResponsibility.mockResolvedValue(null);
    prismaMock.sale.findMany.mockResolvedValue([]);
    const result = await listMyDeliveries(STORE, { id: 'admin_1', role: UserRole.ADMIN });
    expect(result.saleDeliveries).toEqual([]);
    expect(workerRepoMock.findActiveWorkerWithResponsibility).not.toHaveBeenCalled();
  });

  it('starts delivery → IN_TRANSIT', async () => {
    prismaMock.sale.findFirst.mockResolvedValue({
      id: 'sale_1',
      saleNumber: 1,
      status: SaleStatus.ACTIVE,
      deliveryStatus: FulfilmentStatus.SCHEDULED,
      deliveryPersonId: SHOPIR,
      deliveryCost: 150_000n,
    });
    saleServiceMock.updateSale.mockResolvedValue({ id: 'sale_1', deliveryStatus: 'IN_TRANSIT' });

    const result = await updateMySaleDeliveryStatus(
      STORE,
      { id: SHOPIR, role: UserRole.EMPLOYEE },
      'sale_1',
      { status: FulfilmentStatus.IN_TRANSIT },
    );
    expect(saleServiceMock.updateSale).toHaveBeenCalledWith(
      STORE,
      { id: SHOPIR, role: UserRole.EMPLOYEE },
      'sale_1',
      { deliveryStatus: FulfilmentStatus.IN_TRANSIT },
    );
    expect(result.ledgerPosted).toBe(false);
    expect(result.message).toContain('boshlandi');
  });

  it('completes delivery and reports ledgerPosted', async () => {
    prismaMock.sale.findFirst.mockResolvedValue({
      id: 'sale_1',
      saleNumber: 1,
      status: SaleStatus.ACTIVE,
      deliveryStatus: FulfilmentStatus.IN_TRANSIT,
      deliveryPersonId: SHOPIR,
      deliveryCost: 150_000n,
    });
    saleServiceMock.updateSale.mockResolvedValue({ id: 'sale_1', deliveryStatus: 'COMPLETED' });
    financialRepoMock.findOpenCommissionByRef.mockResolvedValue({ id: 'tx_1' });

    const result = await updateMySaleDeliveryStatus(
      STORE,
      { id: SHOPIR, role: UserRole.EMPLOYEE },
      'sale_1',
      { status: FulfilmentStatus.COMPLETED },
    );
    expect(result.ledgerPosted).toBe(true);
    expect(result.message).toMatch(/hisobga/);
  });

  it('blocks shopir from completing before start', async () => {
    prismaMock.sale.findFirst.mockResolvedValue({
      id: 'sale_1',
      saleNumber: 1,
      status: SaleStatus.ACTIVE,
      deliveryStatus: FulfilmentStatus.SCHEDULED,
      deliveryPersonId: SHOPIR,
      deliveryCost: 150_000n,
    });

    await expect(
      updateMySaleDeliveryStatus(
        STORE,
        { id: SHOPIR, role: UserRole.EMPLOYEE },
        'sale_1',
        { status: FulfilmentStatus.COMPLETED },
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(saleServiceMock.updateSale).not.toHaveBeenCalled();
  });

  it('blocks another shopir from completing', async () => {
    prismaMock.sale.findFirst.mockResolvedValue({
      id: 'sale_1',
      saleNumber: 1,
      status: SaleStatus.ACTIVE,
      deliveryStatus: FulfilmentStatus.SCHEDULED,
      deliveryPersonId: SHOPIR,
      deliveryCost: 150_000n,
    });

    await expect(
      updateMySaleDeliveryStatus(
        STORE,
        { id: OTHER, role: UserRole.EMPLOYEE },
        'sale_1',
        { status: FulfilmentStatus.COMPLETED },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(saleServiceMock.updateSale).not.toHaveBeenCalled();
  });

  it('idempotent complete when already COMPLETED', async () => {
    prismaMock.sale.findFirst.mockResolvedValue({
      id: 'sale_1',
      saleNumber: 1,
      status: SaleStatus.ACTIVE,
      deliveryStatus: FulfilmentStatus.COMPLETED,
      deliveryPersonId: SHOPIR,
      deliveryCost: 150_000n,
    });
    saleServiceMock.getSale.mockResolvedValue({ id: 'sale_1' });
    financialRepoMock.findOpenCommissionByRef.mockResolvedValue({ id: 'tx_1' });

    const result = await updateMySaleDeliveryStatus(
      STORE,
      { id: SHOPIR, role: UserRole.EMPLOYEE },
      'sale_1',
      { status: FulfilmentStatus.COMPLETED },
    );
    expect(saleServiceMock.updateSale).not.toHaveBeenCalled();
    expect(result.ledgerPosted).toBe(true);
  });

  it('allows admin to complete any assigned delivery', async () => {
    prismaMock.sale.findFirst.mockResolvedValue({
      id: 'sale_1',
      saleNumber: 1,
      status: SaleStatus.ACTIVE,
      deliveryStatus: FulfilmentStatus.SCHEDULED,
      deliveryPersonId: SHOPIR,
      deliveryCost: 100_000n,
    });
    saleServiceMock.updateSale.mockResolvedValue({ id: 'sale_1' });
    financialRepoMock.findOpenCommissionByRef.mockResolvedValue({ id: 'tx' });

    await updateMySaleDeliveryStatus(
      STORE,
      { id: 'admin_1', role: UserRole.ADMIN },
      'sale_1',
      { status: FulfilmentStatus.COMPLETED },
    );
    expect(saleServiceMock.updateSale).toHaveBeenCalled();
  });

  it('lists pending purchase pickups as completable', async () => {
    prismaMock.sale.findMany.mockResolvedValue([]);
    prismaMock.purchase.findMany.mockResolvedValue([
      {
        id: 'pur_1',
        purchaseNumber: 5,
        purchaseDate: new Date(),
        deliveredAt: null,
        driverFee: 100_000n,
        status: 'ACTIVE',
        driverId: SHOPIR,
        driver: { id: SHOPIR, fullName: 'Azizbek' },
        supplier: { name: 'Wood' },
      },
    ]);

    const result = await listMyDeliveries(STORE, { id: SHOPIR, role: UserRole.EMPLOYEE });
    expect(result.purchaseDeliveries).toHaveLength(1);
    expect(result.purchaseDeliveries[0]?.status).toBe('PENDING');
    expect(result.purchaseDeliveries[0]?.canComplete).toBe(true);
    expect(result.purchaseDeliveries[0]?.ledgerStatus).toBe('PENDING');
  });

  it('completes purchase pickup and posts driver fee', async () => {
    prismaMock.purchase.findFirst.mockResolvedValue({
      id: 'pur_1',
      purchaseNumber: 5,
      status: 'ACTIVE',
      driverId: SHOPIR,
      driverFee: 100_000n,
      deliveredAt: null,
      supplier: { name: 'Wood' },
    });
    financialRepoMock.findOpenCommissionByRef.mockResolvedValue({ id: 'tx_p' });

    const result = await updateMyPurchaseDeliveryStatus(
      STORE,
      { id: SHOPIR, role: UserRole.EMPLOYEE },
      'pur_1',
      { status: 'COMPLETED' },
    );
    expect(feesMock.postPurchaseDriverFee).toHaveBeenCalled();
    expect(result.ledgerPosted).toBe(true);
    expect(result.message).toMatch(/hisobga/);
  });

  it('forbids another shopir from completing a purchase pickup', async () => {
    prismaMock.purchase.findFirst.mockResolvedValue({
      id: 'pur_1',
      purchaseNumber: 5,
      status: 'ACTIVE',
      driverId: SHOPIR,
      driverFee: 100_000n,
      deliveredAt: null,
      supplier: { name: 'Wood' },
    });

    await expect(
      updateMyPurchaseDeliveryStatus(
        STORE,
        { id: OTHER, role: UserRole.EMPLOYEE },
        'pur_1',
        { status: 'COMPLETED' },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(feesMock.postPurchaseDriverFee).not.toHaveBeenCalled();
  });

  it('is idempotent when purchase pickup is already delivered', async () => {
    prismaMock.purchase.findFirst.mockResolvedValue({
      id: 'pur_1',
      purchaseNumber: 5,
      status: 'ACTIVE',
      driverId: SHOPIR,
      driverFee: 100_000n,
      deliveredAt: new Date('2026-09-01T00:00:00.000Z'),
      supplier: { name: 'Wood' },
    });
    financialRepoMock.findOpenCommissionByRef.mockResolvedValue({ id: 'tx_p' });

    const first = await updateMyPurchaseDeliveryStatus(
      STORE,
      { id: SHOPIR, role: UserRole.EMPLOYEE },
      'pur_1',
      { status: 'COMPLETED' },
    );
    const second = await updateMyPurchaseDeliveryStatus(
      STORE,
      { id: SHOPIR, role: UserRole.EMPLOYEE },
      'pur_1',
      { status: 'COMPLETED' },
    );
    expect(first.ledgerPosted).toBe(true);
    expect(second.ledgerPosted).toBe(true);
    expect(feesMock.postPurchaseDriverFee).toHaveBeenCalledTimes(2);
  });
});

void WorkerResponsibility;
