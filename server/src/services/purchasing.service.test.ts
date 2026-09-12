import {
  PaymentMethod,
  PurchasePaymentStatus,
  PurchaseStatus,
  SupplierStatus,
  UserRole,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const { purchasingRepoMock, inventoryRepoMock, prismaMock, workerRepoMock, workerFeesMock } = vi.hoisted(() => ({
  workerFeesMock: {
    postPurchaseDriverFee: vi.fn(async () => true),
    reversePurchaseDriverFee: vi.fn(async () => ({ reversed: 0, preserved: 0 })),
  },
  purchasingRepoMock: {
    listSuppliers: vi.fn(),
    getSupplierDetail: vi.fn(),
    createSupplier: vi.fn(),
    updateSupplier: vi.fn(),
    setSupplierStatus: vi.fn(),
    findSupplierInStore: vi.fn(),
    listPurchases: vi.fn(),
    getPurchaseDetail: vi.fn(),
    nextPurchaseNumber: vi.fn(),
    createPurchaseInTx: vi.fn(),
    updatePurchaseDeliveryInTx: vi.fn(),
    addPaymentInTx: vi.fn(),
    cancelPurchaseInTx: vi.fn(),
    findPurchaseForUpdate: vi.fn(),
    getReportsSupplierPayablesData: vi.fn(),
    sumSupplierPaymentsInPeriod: vi.fn(),
  },
  inventoryRepoMock: {
    applyStockDelta: vi.fn(),
  },
  prismaMock: {
    $transaction: vi.fn(),
    product: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    workerFinancialTransaction: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
  workerRepoMock: {
    findActiveWorkerWithResponsibility: vi.fn(),
  },
}));

vi.mock('../repositories/purchasing.repository.js', () => purchasingRepoMock);
vi.mock('../repositories/inventory.repository.js', () => inventoryRepoMock);
vi.mock('../repositories/worker.repository.js', () => workerRepoMock);
vi.mock('./worker-operational-fees.service.js', () => workerFeesMock);
vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));
vi.mock('./entitlement.service.js', () => ({
  assertCanUseFeature: vi.fn(),
  assertCanCreateResource: vi.fn(),
}));

const {
  addPayment,
  archiveSupplier,
  assertCanManagePurchasing,
  cancelPurchase,
  createPurchase,
  createSupplier,
  listSuppliers,
  paymentStatusFromAmounts,
  updatePurchaseDelivery,
  updateSupplier,
} = await import('./purchasing.service.js');

const STORE = 'store_1';
const ADMIN = UserRole.ADMIN;
const EMPLOYEE = UserRole.EMPLOYEE;
const ACTOR = { id: 'user_admin', role: ADMIN };

const SUPPLIER = {
  id: 'clxxxxxxxxxxxxxxxxxxxxxxxx1',
  storeId: STORE,
  name: 'Wood Supply',
  phone: '+998901234567',
  notes: null,
  status: SupplierStatus.ACTIVE,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
};

const PURCHASE_DETAIL = {
  id: 'clxxxxxxxxxxxxxxxxxxxxxxxx2',
  purchaseNumber: 1,
  purchaseDate: '2026-08-20T00:00:00.000Z',
  supplierId: SUPPLIER.id,
  supplierName: SUPPLIER.name,
  totalCost: 1_000_000,
  paidAmount: 200_000,
  remainingAmount: 800_000,
  paymentStatus: PurchasePaymentStatus.PARTIALLY_PAID,
  status: PurchaseStatus.ACTIVE,
  itemCount: 1,
  createdAt: '2026-08-20T00:00:00.000Z',
  deliveredAt: '2026-08-20T00:00:00.000Z',
  deliveryDays: 0,
  driverId: null,
  driverName: null,
  driverFee: 0,
  notes: null,
  items: [
    {
      id: 'item_1',
      productId: 'clxxxxxxxxxxxxxxxxxxxxxxxx3',
      productName: 'Divan',
      quantity: 2,
      unitCost: 500_000,
      lineTotal: 1_000_000,
    },
  ],
  payments: [
    {
      paymentId: 'pay_1',
      amount: 200_000,
      method: PaymentMethod.CASH,
      paidAt: '2026-08-20T00:00:00.000Z',
      note: null,
      recordedByName: 'Admin',
    },
  ],
  stockMovements: [],
  cancelledAt: null,
  cancellationReason: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  (prismaMock.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
  );
  (prismaMock.workerFinancialTransaction.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
    null,
  );
  (prismaMock.workerFinancialTransaction.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (prismaMock.workerFinancialTransaction.create as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: 'wft_1',
  });
});

describe('purchasing.service permissions', () => {
  it('allows admin to manage purchasing', () => {
    expect(() => assertCanManagePurchasing(ADMIN)).not.toThrow();
  });

  it('forbids employee purchasing management', () => {
    expect(() => assertCanManagePurchasing(EMPLOYEE)).toThrow(ApiError);
  });

  it('rejects list for non-admin', async () => {
    await expect(listSuppliers(STORE, EMPLOYEE, {})).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('paymentStatusFromAmounts', () => {
  it('maps unpaid / partial / paid', () => {
    expect(paymentStatusFromAmounts(0, 1_000_000)).toBe(PurchasePaymentStatus.UNPAID);
    expect(paymentStatusFromAmounts(400_000, 1_000_000)).toBe(
      PurchasePaymentStatus.PARTIALLY_PAID,
    );
    expect(paymentStatusFromAmounts(1_000_000, 1_000_000)).toBe(PurchasePaymentStatus.PAID);
  });
});

describe('purchasing.service suppliers', () => {
  it('creates a supplier with normalised phone', async () => {
    purchasingRepoMock.createSupplier.mockResolvedValue({
      id: SUPPLIER.id,
      name: 'Wood Supply',
      phone: '+998901234567',
      notes: null,
      status: SupplierStatus.ACTIVE,
      totalPurchases: 0,
      totalPaid: 0,
      outstandingDebt: 0,
      openPurchaseCount: 0,
      lastPurchaseAt: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    });

    const created = await createSupplier(STORE, ADMIN, {
      name: 'Wood Supply',
      phone: '90 123 45 67',
    });

    expect(created.phone).toBe('+998901234567');
    expect(purchasingRepoMock.createSupplier).toHaveBeenCalledWith(
      STORE,
      expect.objectContaining({ name: 'Wood Supply', phone: '+998901234567' }),
    );
  });

  it('allows null phone and rejects invalid digits', async () => {
    purchasingRepoMock.createSupplier.mockResolvedValue({
      id: SUPPLIER.id,
      name: 'No Phone',
      phone: null,
      notes: null,
      status: SupplierStatus.ACTIVE,
      totalPurchases: 0,
      totalPaid: 0,
      outstandingDebt: 0,
      openPurchaseCount: 0,
      lastPurchaseAt: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    });

    await createSupplier(STORE, ADMIN, { name: 'No Phone' });
    expect(purchasingRepoMock.createSupplier).toHaveBeenCalledWith(
      STORE,
      expect.objectContaining({ phone: null }),
    );

    await expect(
      createSupplier(STORE, ADMIN, { name: 'Bad', phone: '123' }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('archives a supplier', async () => {
    purchasingRepoMock.setSupplierStatus.mockResolvedValue({
      id: SUPPLIER.id,
      name: SUPPLIER.name,
      phone: SUPPLIER.phone,
      notes: null,
      status: SupplierStatus.ARCHIVED,
      totalPurchases: 0,
      totalPaid: 0,
      outstandingDebt: 0,
      openPurchaseCount: 0,
      lastPurchaseAt: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    });

    const archived = await archiveSupplier(STORE, ADMIN, SUPPLIER.id);
    expect(archived.status).toBe(SupplierStatus.ARCHIVED);
    expect(purchasingRepoMock.setSupplierStatus).toHaveBeenCalledWith(
      STORE,
      SUPPLIER.id,
      SupplierStatus.ARCHIVED,
    );
  });

  it('updates supplier name', async () => {
    purchasingRepoMock.updateSupplier.mockResolvedValue({
      id: SUPPLIER.id,
      name: 'New Name',
      phone: SUPPLIER.phone,
      notes: null,
      status: SupplierStatus.ACTIVE,
      totalPurchases: 0,
      totalPaid: 0,
      outstandingDebt: 0,
      openPurchaseCount: 0,
      lastPurchaseAt: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    });

    const updated = await updateSupplier(STORE, ADMIN, SUPPLIER.id, { name: 'New Name' });
    expect(updated.name).toBe('New Name');
  });
});

describe('purchasing.service create purchase', () => {
  it('creates purchase, applies stock, and records initial payment atomically', async () => {
    purchasingRepoMock.findSupplierInStore.mockResolvedValue(SUPPLIER);
    (prismaMock.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'clxxxxxxxxxxxxxxxxxxxxxxxx3',
        name: 'Divan',
        trackStock: false,
        minStockQty: 0,
      },
    ]);
    purchasingRepoMock.nextPurchaseNumber.mockResolvedValue(1);
    purchasingRepoMock.createPurchaseInTx.mockResolvedValue({ id: PURCHASE_DETAIL.id });
    purchasingRepoMock.addPaymentInTx.mockResolvedValue({ paymentId: 'pay_1' });
    inventoryRepoMock.applyStockDelta.mockResolvedValue({
      movement: { id: 'mov_1' },
      stockQty: 2,
    });
    purchasingRepoMock.getPurchaseDetail.mockResolvedValue(PURCHASE_DETAIL);

    const result = await createPurchase(STORE, ACTOR, {
      supplierId: SUPPLIER.id,
      items: [{ productId: 'clxxxxxxxxxxxxxxxxxxxxxxxx3', quantity: 2, unitCost: 500_000 }],
      paidAmount: 200_000,
      paymentMethod: PaymentMethod.CASH,
    });

    expect(result.id).toBe(PURCHASE_DETAIL.id);
    expect(prismaMock.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ trackStock: true }),
      }),
    );
    expect(inventoryRepoMock.applyStockDelta).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({
        quantityDelta: 2,
        movementType: 'PURCHASE',
        referenceType: 'PURCHASE',
        referenceId: PURCHASE_DETAIL.id,
      }),
    );
    expect(purchasingRepoMock.addPaymentInTx).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({ amount: 200_000, method: PaymentMethod.CASH }),
    );
  });

  it('rejects paid amount above total', async () => {
    purchasingRepoMock.findSupplierInStore.mockResolvedValue(SUPPLIER);
    (prismaMock.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'clxxxxxxxxxxxxxxxxxxxxxxxx3',
        name: 'Divan',
        trackStock: true,
        minStockQty: 2,
      },
    ]);

    await expect(
      createPurchase(STORE, ACTOR, {
        supplierId: SUPPLIER.id,
        items: [{ productId: 'clxxxxxxxxxxxxxxxxxxxxxxxx3', quantity: 1, unitCost: 100 }],
        paidAmount: 200,
        paymentMethod: PaymentMethod.CASH,
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('persists delivery fields without changing product totalCost', async () => {
    const DRIVER_ID = 'clxxxxxxxxxxxxxxxxxxxxxxxx9';
    purchasingRepoMock.findSupplierInStore.mockResolvedValue(SUPPLIER);
    (prismaMock.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'clxxxxxxxxxxxxxxxxxxxxxxxx3',
        name: 'Divan',
        trackStock: true,
        minStockQty: 2,
      },
    ]);
    workerRepoMock.findActiveWorkerWithResponsibility.mockResolvedValue({ id: DRIVER_ID });
    purchasingRepoMock.nextPurchaseNumber.mockResolvedValue(1);
    purchasingRepoMock.createPurchaseInTx.mockResolvedValue({ id: PURCHASE_DETAIL.id });
    inventoryRepoMock.applyStockDelta.mockResolvedValue({
      movement: { id: 'mov_1' },
      stockQty: 2,
    });
    purchasingRepoMock.getPurchaseDetail.mockResolvedValue({
      ...PURCHASE_DETAIL,
      deliveredAt: '2026-08-24T00:00:00.000Z',
      deliveryDays: 3,
      driverId: DRIVER_ID,
      driverName: 'Abdulla',
      driverFee: 150_000,
      paidAmount: 0,
      remainingAmount: 1_000_000,
      paymentStatus: PurchasePaymentStatus.UNPAID,
      payments: [],
    });

    const result = await createPurchase(STORE, ACTOR, {
      supplierId: SUPPLIER.id,
      items: [{ productId: 'clxxxxxxxxxxxxxxxxxxxxxxxx3', quantity: 2, unitCost: 500_000 }],
      deliveredAt: '2026-08-24',
      deliveryDays: 3,
      driverId: DRIVER_ID,
      driverFee: 150_000,
    });

    expect(purchasingRepoMock.createPurchaseInTx).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({
        totalCost: 1_000_000,
        driverFee: 150_000,
        deliveryDays: 3,
        driverId: DRIVER_ID,
      }),
    );
    expect(result.driverFee).toBe(150_000);
    expect(result.totalCost).toBe(1_000_000);
    expect(result.remainingAmount).toBe(1_000_000);
  });

  it('does not post shopir fee until deliveredAt is set', async () => {
    const DRIVER_ID = 'clxxxxxxxxxxxxxxxxxxxxxxxx9';
    purchasingRepoMock.findSupplierInStore.mockResolvedValue(SUPPLIER);
    (prismaMock.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'clxxxxxxxxxxxxxxxxxxxxxxxx3',
        name: 'Divan',
        trackStock: true,
        minStockQty: 2,
      },
    ]);
    workerRepoMock.findActiveWorkerWithResponsibility.mockResolvedValue({ id: DRIVER_ID });
    purchasingRepoMock.nextPurchaseNumber.mockResolvedValue(1);
    purchasingRepoMock.createPurchaseInTx.mockResolvedValue({ id: PURCHASE_DETAIL.id });
    inventoryRepoMock.applyStockDelta.mockResolvedValue({
      movement: { id: 'mov_1' },
      stockQty: 2,
    });
    purchasingRepoMock.getPurchaseDetail.mockResolvedValue({
      ...PURCHASE_DETAIL,
      deliveredAt: null,
      driverId: DRIVER_ID,
      driverFee: 100_000,
    });

    await createPurchase(STORE, ACTOR, {
      supplierId: SUPPLIER.id,
      items: [{ productId: 'clxxxxxxxxxxxxxxxxxxxxxxxx3', quantity: 2, unitCost: 500_000 }],
      driverId: DRIVER_ID,
      driverFee: 100_000,
    });

    expect(workerFeesMock.postPurchaseDriverFee).not.toHaveBeenCalled();
    expect(purchasingRepoMock.createPurchaseInTx).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({ deliveredAt: null, driverId: DRIVER_ID, driverFee: 100_000 }),
    );
  });

  it('posts shopir fee when kirim is created already delivered', async () => {
    const DRIVER_ID = 'clxxxxxxxxxxxxxxxxxxxxxxxx9';
    purchasingRepoMock.findSupplierInStore.mockResolvedValue(SUPPLIER);
    (prismaMock.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'clxxxxxxxxxxxxxxxxxxxxxxxx3',
        name: 'Divan',
        trackStock: true,
        minStockQty: 2,
      },
    ]);
    workerRepoMock.findActiveWorkerWithResponsibility.mockResolvedValue({ id: DRIVER_ID });
    purchasingRepoMock.nextPurchaseNumber.mockResolvedValue(1);
    purchasingRepoMock.createPurchaseInTx.mockResolvedValue({ id: PURCHASE_DETAIL.id });
    inventoryRepoMock.applyStockDelta.mockResolvedValue({
      movement: { id: 'mov_1' },
      stockQty: 2,
    });
    purchasingRepoMock.getPurchaseDetail.mockResolvedValue({
      ...PURCHASE_DETAIL,
      driverId: DRIVER_ID,
      driverFee: 100_000,
    });

    await createPurchase(STORE, ACTOR, {
      supplierId: SUPPLIER.id,
      items: [{ productId: 'clxxxxxxxxxxxxxxxxxxxxxxxx3', quantity: 2, unitCost: 500_000 }],
      deliveredAt: '2026-08-24',
      driverId: DRIVER_ID,
      driverFee: 100_000,
    });

    expect(workerFeesMock.postPurchaseDriverFee).toHaveBeenCalledWith(
      expect.objectContaining({
        workerId: DRIVER_ID,
        driverFee: 100_000,
        purchaseId: PURCHASE_DETAIL.id,
      }),
    );
  });

  it('allows shopir fee without a driver', async () => {
    purchasingRepoMock.findSupplierInStore.mockResolvedValue(SUPPLIER);
    (prismaMock.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'clxxxxxxxxxxxxxxxxxxxxxxxx3',
        name: 'Divan',
        trackStock: true,
        minStockQty: 2,
      },
    ]);
    purchasingRepoMock.nextPurchaseNumber.mockResolvedValue(1);
    purchasingRepoMock.createPurchaseInTx.mockResolvedValue({ id: PURCHASE_DETAIL.id });
    inventoryRepoMock.applyStockDelta.mockResolvedValue({
      movement: { id: 'mov_1' },
      stockQty: 2,
    });
    purchasingRepoMock.getPurchaseDetail.mockResolvedValue({
      ...PURCHASE_DETAIL,
      driverFee: 50_000,
      driverId: null,
      driverName: null,
    });

    await createPurchase(STORE, ACTOR, {
      supplierId: SUPPLIER.id,
      items: [{ productId: 'clxxxxxxxxxxxxxxxxxxxxxxxx3', quantity: 2, unitCost: 500_000 }],
      driverFee: 50_000,
    });

    expect(purchasingRepoMock.createPurchaseInTx).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({ driverId: null, driverFee: 50_000 }),
    );
    expect(workerRepoMock.findActiveWorkerWithResponsibility).not.toHaveBeenCalled();
  });

  it('rejects negative delivery days and driver fee', async () => {
    purchasingRepoMock.findSupplierInStore.mockResolvedValue(SUPPLIER);
    (prismaMock.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'clxxxxxxxxxxxxxxxxxxxxxxxx3',
        name: 'Divan',
        trackStock: true,
        minStockQty: 2,
      },
    ]);

    await expect(
      createPurchase(STORE, ACTOR, {
        supplierId: SUPPLIER.id,
        items: [{ productId: 'clxxxxxxxxxxxxxxxxxxxxxxxx3', quantity: 1, unitCost: 100 }],
        deliveryDays: -1,
      }),
    ).rejects.toMatchObject({ statusCode: 422 });

    await expect(
      createPurchase(STORE, ACTOR, {
        supplierId: SUPPLIER.id,
        items: [{ productId: 'clxxxxxxxxxxxxxxxxxxxxxxxx3', quantity: 1, unitCost: 100 }],
        driverFee: -10,
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe('purchasing.service update delivery', () => {
  it('updates delivery fields on ACTIVE purchase', async () => {
    purchasingRepoMock.getPurchaseDetail
      .mockResolvedValueOnce(PURCHASE_DETAIL)
      .mockResolvedValueOnce({
        ...PURCHASE_DETAIL,
        deliveredAt: '2026-08-24T00:00:00.000Z',
        deliveryDays: 3,
        driverFee: 150_000,
      });

    const updated = await updatePurchaseDelivery(STORE, ACTOR, PURCHASE_DETAIL.id, {
      deliveredAt: '2026-08-24',
      deliveryDays: 3,
      driverFee: 150_000,
    });

    expect(purchasingRepoMock.updatePurchaseDeliveryInTx).toHaveBeenCalled();
    expect(updated.deliveryDays).toBe(3);
    expect(updated.driverFee).toBe(150_000);
  });

  it('forbids employee from updating delivery', async () => {
    await expect(
      updatePurchaseDelivery(STORE, { id: 'emp', role: EMPLOYEE }, PURCHASE_DETAIL.id, {
        driverFee: 1,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('blocks delivery edits on cancelled purchases', async () => {
    purchasingRepoMock.getPurchaseDetail.mockResolvedValue({
      ...PURCHASE_DETAIL,
      status: PurchaseStatus.CANCELLED,
    });

    await expect(
      updatePurchaseDelivery(STORE, ACTOR, PURCHASE_DETAIL.id, { deliveryDays: 1 }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('purchasing.service payments and cancel', () => {
  it('adds a payment against remaining balance', async () => {
    purchasingRepoMock.findPurchaseForUpdate.mockResolvedValue({
      id: PURCHASE_DETAIL.id,
      storeId: STORE,
      supplierId: SUPPLIER.id,
      totalCost: 1_000_000n,
      paidAmount: 200_000n,
      remainingAmount: 800_000n,
      status: PurchaseStatus.ACTIVE,
      items: [],
      payments: [],
    });
    purchasingRepoMock.addPaymentInTx.mockResolvedValue({ paymentId: 'pay_2' });
    purchasingRepoMock.getPurchaseDetail.mockResolvedValue({
      ...PURCHASE_DETAIL,
      paidAmount: 500_000,
      remainingAmount: 500_000,
      payments: [
        ...PURCHASE_DETAIL.payments,
        {
          paymentId: 'pay_2',
          amount: 300_000,
          method: PaymentMethod.CARD,
          paidAt: '2026-08-21T00:00:00.000Z',
          note: null,
          recordedByName: 'Admin',
        },
      ],
    });

    const result = await addPayment(STORE, ACTOR, PURCHASE_DETAIL.id, {
      amount: 300_000,
      method: PaymentMethod.CARD,
    });

    expect(result.payment.paymentId).toBe('pay_2');
    expect(result.purchase.remainingAmount).toBe(500_000);
    expect(purchasingRepoMock.addPaymentInTx).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({
        paidAmount: 500_000,
        remainingAmount: 500_000,
        paymentStatus: PurchasePaymentStatus.PARTIALLY_PAID,
      }),
    );
  });

  it('cancels purchase and reverses stock', async () => {
    purchasingRepoMock.findPurchaseForUpdate.mockResolvedValue({
      id: PURCHASE_DETAIL.id,
      storeId: STORE,
      supplierId: SUPPLIER.id,
      purchaseNumber: 1,
      totalCost: 1_000_000n,
      paidAmount: 200_000n,
      remainingAmount: 800_000n,
      status: PurchaseStatus.ACTIVE,
      items: [
        {
          productId: 'clxxxxxxxxxxxxxxxxxxxxxxxx3',
          productName: 'Divan',
          quantity: 2,
        },
      ],
      payments: [],
    });
    inventoryRepoMock.applyStockDelta.mockResolvedValue({
      movement: { id: 'mov_out' },
      stockQty: 0,
    });
    purchasingRepoMock.cancelPurchaseInTx.mockResolvedValue(undefined);
    purchasingRepoMock.getPurchaseDetail.mockResolvedValue({
      ...PURCHASE_DETAIL,
      status: PurchaseStatus.CANCELLED,
      remainingAmount: 0,
      cancelledAt: '2026-08-21T00:00:00.000Z',
      cancellationReason: 'Wrong supplier',
    });

    const cancelled = await cancelPurchase(STORE, ACTOR, PURCHASE_DETAIL.id, {
      reason: 'Wrong supplier',
    });

    expect(cancelled.status).toBe(PurchaseStatus.CANCELLED);
    expect(cancelled.remainingAmount).toBe(0);
    expect(inventoryRepoMock.applyStockDelta).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({
        quantityDelta: -2,
        referenceType: 'PURCHASE',
        referenceId: PURCHASE_DETAIL.id,
      }),
    );
    expect(purchasingRepoMock.cancelPurchaseInTx).toHaveBeenCalled();
  });

  it('tells the fee service the goods already arrived so the shopir keeps the fee', async () => {
    const deliveredAt = new Date('2026-08-20T00:00:00.000Z');
    purchasingRepoMock.findPurchaseForUpdate.mockResolvedValue({
      id: PURCHASE_DETAIL.id,
      storeId: STORE,
      supplierId: SUPPLIER.id,
      purchaseNumber: 1,
      status: PurchaseStatus.ACTIVE,
      deliveredAt,
      driverFee: 150_000n,
      items: [],
      payments: [],
    });
    purchasingRepoMock.cancelPurchaseInTx.mockResolvedValue(undefined);
    purchasingRepoMock.getPurchaseDetail.mockResolvedValue({
      ...PURCHASE_DETAIL,
      status: PurchaseStatus.CANCELLED,
    });

    await cancelPurchase(STORE, ACTOR, PURCHASE_DETAIL.id, { reason: 'Wrong supplier' });

    expect(workerFeesMock.reversePurchaseDriverFee).toHaveBeenCalledWith(
      expect.objectContaining({ purchaseId: PURCHASE_DETAIL.id, deliveredAt }),
    );
  });

  it('rejects double cancel', async () => {
    purchasingRepoMock.findPurchaseForUpdate.mockResolvedValue({
      id: PURCHASE_DETAIL.id,
      status: PurchaseStatus.CANCELLED,
      items: [],
      payments: [],
    });

    await expect(
      cancelPurchase(STORE, ACTOR, PURCHASE_DETAIL.id, { reason: 'Again please' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('maps insufficient stock on cancel', async () => {
    purchasingRepoMock.findPurchaseForUpdate.mockResolvedValue({
      id: PURCHASE_DETAIL.id,
      storeId: STORE,
      supplierId: SUPPLIER.id,
      purchaseNumber: 1,
      status: PurchaseStatus.ACTIVE,
      items: [
        {
          productId: 'clxxxxxxxxxxxxxxxxxxxxxxxx3',
          productName: 'Divan',
          quantity: 2,
        },
      ],
      payments: [],
    });
    inventoryRepoMock.applyStockDelta.mockRejectedValue(
      Object.assign(new Error('INSUFFICIENT_STOCK'), {
        code: 'INSUFFICIENT_STOCK',
        productName: 'Divan',
        available: 0,
        requested: 2,
      }),
    );

    await expect(
      cancelPurchase(STORE, ACTOR, PURCHASE_DETAIL.id, { reason: 'Stock sold already' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
