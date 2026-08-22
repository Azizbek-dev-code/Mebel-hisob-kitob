import {
  AssemblyTaskStatus,
  FulfilmentStatus,
  PaymentMethod,
  PaymentType,
  SalePaymentStatus,
  SaleWorkerPayRole,
  UserRole,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => {
  const mock: Record<string, unknown> = {
    $transaction: vi.fn(),
    customer: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    product: { findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    user: { findFirst: vi.fn() },
    sale: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    saleItem: { findMany: vi.fn() },
    payment: { create: vi.fn() },
    installmentPlan: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    installmentPayment: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    assemblyTask: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    workerActivity: {
      create: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    saleWorkerCompensation: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    workerFinancialTransaction: {
      findFirst: vi.fn(),
    },
    workerCompensationRule: {
      findMany: vi.fn(),
    },
  };
  return { prismaMock: mock };
});

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('./audit.service.js', () => ({
  recordAudit: vi.fn(async () => undefined),
}));

vi.mock('./entitlement.service.js', () => ({
  assertCanUseFeature: vi.fn(),
  assertCanCreateResource: vi.fn(),
}));

import * as saleService from './sale.service.js';

const STORE_ID = 'store_1';
const OTHER_STORE = 'store_2';
const ADMIN_ID = 'user_admin';
const ALI_ID = 'user_ali';
const SELLER_ID = 'user_seller';
const CUSTOMER_ID = 'cust_1';
const PRODUCT_ID = 'prod_1';
const SALE_ID = 'sale_1';

const PRODUCT = {
  id: PRODUCT_ID,
  storeId: STORE_ID,
  name: 'Bedroom Set "Milano"',
  sku: 'BR-MIL-01',
  costPrice: 7_000_000n,
  defaultSalePrice: 9_500_000n,
  status: 'ACTIVE',
  stockQty: 10,
  minStockQty: 2,
  trackStock: true,
};

const CUSTOMER = {
  id: CUSTOMER_ID,
  storeId: STORE_ID,
  firstName: 'Ali',
  lastName: 'Valiyev',
  phone: '+998901111111',
  address: 'Toshkent',
  status: 'ACTIVE',
};

const WORKER = {
  id: SELLER_ID,
  storeId: STORE_ID,
  fullName: 'Sardor',
  role: UserRole.CASHIER,
  isActive: true,
};

const ALI = {
  id: ALI_ID,
  storeId: STORE_ID,
  fullName: 'Ali Usta',
  role: UserRole.EMPLOYEE,
  isActive: true,
};

function detailSale(overrides: Record<string, unknown> = {}) {
  return {
    id: SALE_ID,
    storeId: STORE_ID,
    saleNumber: 123,
    saleDate: new Date('2026-08-08T12:00:00.000Z'),
    status: 'ACTIVE',
    customerId: CUSTOMER_ID,
    sellerId: SELLER_ID,
    installerId: ALI_ID,
    deliveryPersonId: null,
    createdById: ADMIN_ID,
    subtotal: 9_500_000n,
    discountAmount: 0n,
    totalSalePrice: 9_500_000n,
    totalCostPrice: 7_000_000n,
    paymentType: PaymentType.DEPOSIT,
    paymentStatus: SalePaymentStatus.PARTIALLY_PAID,
    depositAmount: 2_000_000n,
    paidAmount: 2_000_000n,
    remainingAmount: 7_500_000n,
    sellerBonus: 0n,
    installationCost: 0n,
    deliveryCost: 0n,
    otherCosts: 0n,
    grossProfit: 2_500_000n,
    netProfit: 2_500_000n,
    assemblyStatus: AssemblyTaskStatus.PENDING,
    installationStatus: FulfilmentStatus.PENDING,
    installationDate: null,
    installationNotes: null,
    deliveryStatus: FulfilmentStatus.NOT_REQUIRED,
    deliveryDate: null,
    deliveryAddress: null,
    deliveryNotes: null,
    notes: null,
    cancelledAt: null,
    cancelledById: null,
    cancellationReason: null,
    createdAt: new Date('2026-08-08T12:00:00.000Z'),
    updatedAt: new Date('2026-08-08T12:00:00.000Z'),
    customer: CUSTOMER,
    seller: WORKER,
    installer: ALI,
    deliveryPerson: null,
    createdBy: { id: ADMIN_ID, fullName: 'Admin', role: UserRole.ADMIN },
    cancelledBy: null,
    items: [
      {
        id: 'item_1',
        productId: PRODUCT_ID,
        productName: PRODUCT.name,
        productSku: PRODUCT.sku,
        quantity: 1,
        unitCostPrice: 7_000_000n,
        unitSalePrice: 9_500_000n,
        lineCostTotal: 7_000_000n,
        lineSaleTotal: 9_500_000n,
        product: { imageUrl: null },
      },
    ],
    payments: [
      {
        id: 'pay_1',
        amount: 2_000_000n,
        method: PaymentMethod.CASH,
        paidAt: new Date('2026-08-08T12:00:00.000Z'),
        isDeposit: true,
        note: 'Initial deposit',
        createdAt: new Date('2026-08-08T12:00:00.000Z'),
        createdBy: { id: ADMIN_ID, fullName: 'Admin', role: UserRole.ADMIN },
      },
    ],
    installmentPlan: null,
    assemblyTasks: [
      {
        id: 'task_1',
        storeId: STORE_ID,
        saleId: SALE_ID,
        assigneeId: ALI_ID,
        assignedById: ADMIN_ID,
        completedById: null,
        status: AssemblyTaskStatus.PENDING,
        assignedAt: new Date('2026-08-08T12:00:00.000Z'),
        deadline: null,
        startedAt: null,
        completedAt: null,
        notes: null,
        createdAt: new Date('2026-08-08T12:00:00.000Z'),
        updatedAt: new Date('2026-08-08T12:00:00.000Z'),
        assignee: ALI,
        assignedBy: { id: ADMIN_ID, fullName: 'Admin', role: UserRole.ADMIN },
        completedBy: null,
        sale: {
          id: SALE_ID,
          saleNumber: 123,
          customer: { firstName: 'Ali', lastName: 'Valiyev' },
          items: [{ productName: PRODUCT.name, quantity: 1 }],
        },
      },
    ],
    workerCompensations: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (prismaMock.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
  );

  (prismaMock.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([PRODUCT]);
  (prismaMock.product.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(PRODUCT);
  (prismaMock.product.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
  (prismaMock.stockMovement.create as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: 'mov_1',
    storeId: STORE_ID,
    productId: PRODUCT_ID,
    quantity: -1,
    quantityBefore: 10,
    quantityAfter: 9,
    movementType: 'SALE',
    referenceType: 'SALE',
    referenceId: SALE_ID,
    reason: 'Sale #123',
    createdById: ADMIN_ID,
    createdAt: new Date(),
    product: { id: PRODUCT_ID, name: PRODUCT.name, sku: PRODUCT.sku },
    createdBy: null,
  });
  (prismaMock.user.findFirst as ReturnType<typeof vi.fn>).mockImplementation(
    async ({ where }: { where: { id?: string; storeId?: string } }) => {
      if (where.storeId !== STORE_ID) return null;
      if (where.id === SELLER_ID || where.id === ADMIN_ID) return WORKER;
      if (where.id === ALI_ID) return ALI;
      return null;
    },
  );
  (prismaMock.customer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(CUSTOMER);
  (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(detailSale());
  (prismaMock.workerActivity.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'act_1' });
  (prismaMock.saleWorkerCompensation.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
    count: 0,
  });
  (prismaMock.saleWorkerCompensation.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({
    count: 0,
  });
  (prismaMock.workerFinancialTransaction.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
    null,
  );
  (prismaMock.workerCompensationRule.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

describe('createSale', () => {
  it('creates a sale with customer, product, seller and financial snapshot', async () => {
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ saleNumber: 122 })
      .mockResolvedValue(detailSale());

    (prismaMock.sale.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: SALE_ID });
    (prismaMock.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'pay_1' });
    (prismaMock.assemblyTask.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'task_1' });
    (prismaMock.workerActivity.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'act_1' });

    const sale = await saleService.createSale(STORE_ID, ADMIN_ID, {
      customerId: CUSTOMER_ID,
      sellerId: SELLER_ID,
      items: [{ productId: PRODUCT_ID, quantity: 1, unitCostPrice: 7_000_000, unitSalePrice: 9_500_000 }],
      paymentType: PaymentType.DEPOSIT,
      depositAmount: 2_000_000,
      depositMethod: PaymentMethod.CASH,
      assemblerId: ALI_ID,
      deliveryRequired: true,
      installationRequired: true,
    });

    expect(prismaMock.sale.create).toHaveBeenCalled();
    expect(prismaMock.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          movementType: 'SALE',
          quantity: -1,
          referenceId: SALE_ID,
        }),
      }),
    );
    const createArgs = (prismaMock.sale.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(createArgs.data.storeId).toBe(STORE_ID);
    expect(createArgs.data.totalSalePrice).toBe(9_500_000n);
    expect(createArgs.data.totalCostPrice).toBe(7_000_000n);
    expect(createArgs.data.grossProfit).toBe(2_500_000n);
    expect(createArgs.data.depositAmount).toBe(2_000_000n);
    expect(createArgs.data.paidAmount).toBe(2_000_000n);
    expect(createArgs.data.remainingAmount).toBe(7_500_000n);
    expect(createArgs.data.paymentStatus).toBe(SalePaymentStatus.PARTIALLY_PAID);
    expect(prismaMock.payment.create).toHaveBeenCalled();
    expect(prismaMock.assemblyTask.create).toHaveBeenCalled();
    expect(sale.remainingAmount).toBe(7_500_000);
    expect(sale.grossProfit).toBe(2_500_000);
    expect(sale.customer.id).toBe(CUSTOMER_ID);
    expect(sale.assembler?.id).toBe(ALI_ID);
  });

  it('rejects sale when stock is insufficient', async () => {
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ saleNumber: 50 });
    (prismaMock.sale.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: SALE_ID });
    (prismaMock.product.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...PRODUCT,
      stockQty: 0,
    });
    (prismaMock.product.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

    await expect(
      saleService.createSale(STORE_ID, ADMIN_ID, {
        customerId: CUSTOMER_ID,
        sellerId: SELLER_ID,
        items: [{ productId: PRODUCT_ID, quantity: 1 }],
        paymentType: PaymentType.FULL_PAYMENT,
        depositAmount: 9_500_000,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prismaMock.stockMovement.create).not.toHaveBeenCalled();
  });

  it('rejects products from another store', async () => {
    (prismaMock.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await expect(
      saleService.createSale(STORE_ID, ADMIN_ID, {
        customerId: CUSTOMER_ID,
        items: [{ productId: 'foreign_product', quantity: 1 }],
        paymentType: PaymentType.DEPOSIT,
        depositAmount: 0,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects invalid full-payment when deposit does not cover total', async () => {
    await expect(
      saleService.createSale(STORE_ID, ADMIN_ID, {
        customerId: CUSTOMER_ID,
        items: [{ productId: PRODUCT_ID, quantity: 1, unitCostPrice: 7_000_000, unitSalePrice: 9_500_000 }],
        paymentType: PaymentType.FULL_PAYMENT,
        depositAmount: 2_000_000,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('creates an installment schedule for installment sales', async () => {
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ saleNumber: 1 })
      .mockResolvedValue(detailSale({ paymentType: PaymentType.INSTALLMENT }));
    (prismaMock.sale.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: SALE_ID });
    (prismaMock.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'pay_1' });
    (prismaMock.installmentPlan.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'plan_1' });

    await saleService.createSale(STORE_ID, ADMIN_ID, {
      customerId: CUSTOMER_ID,
      items: [{ productId: PRODUCT_ID, quantity: 1, unitCostPrice: 7_000_000, unitSalePrice: 9_500_000 }],
      paymentType: PaymentType.INSTALLMENT,
      depositAmount: 2_000_000,
      installmentMonthCount: 3,
    });

    expect(prismaMock.installmentPlan.create).toHaveBeenCalled();
    const planArgs = (prismaMock.installmentPlan.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(planArgs.data.financedAmount).toBe(7_500_000n);
    expect(planArgs.data.monthCount).toBe(3);
    expect(planArgs.data.payments.create).toHaveLength(3);
  });
});

describe('addPayment', () => {
  function saleForPayment(paid = 2_000_000n, remaining = 7_500_000n) {
    return {
      id: SALE_ID,
      storeId: STORE_ID,
      customerId: CUSTOMER_ID,
      status: 'ACTIVE',
      totalSalePrice: 9_500_000n,
      paidAmount: paid,
      remainingAmount: remaining,
      depositAmount: 2_000_000n,
      installmentPlan: null,
    };
  }

  it('records a partial payment and updates remaining balance', async () => {
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(saleForPayment())
      .mockResolvedValue(
        detailSale({
          paidAmount: 5_000_000n,
          remainingAmount: 4_500_000n,
          paymentStatus: SalePaymentStatus.PARTIALLY_PAID,
          payments: [
            ...detailSale().payments,
            {
              id: 'pay_2',
              amount: 3_000_000n,
              method: PaymentMethod.CARD,
              paidAt: new Date('2026-08-15T12:00:00.000Z'),
              isDeposit: false,
              note: null,
              createdAt: new Date('2026-08-15T12:00:00.000Z'),
              createdBy: WORKER,
            },
          ],
        }),
      );

    (prismaMock.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pay_2',
      createdBy: WORKER,
    });
    (prismaMock.sale.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await saleService.addPayment(STORE_ID, ADMIN_ID, SALE_ID, {
      amount: 3_000_000,
      method: PaymentMethod.CARD,
    });

    const updateArgs = (prismaMock.sale.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(updateArgs.data.paidAmount).toBe(5_000_000n);
    expect(updateArgs.data.remainingAmount).toBe(4_500_000n);
    expect(updateArgs.data.paymentStatus).toBe(SalePaymentStatus.PARTIALLY_PAID);
    expect(result.sale.remainingAmount).toBe(4_500_000);
  });

  it('supports multiple payments until fully paid', async () => {
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(saleForPayment(5_000_000n, 4_500_000n))
      .mockResolvedValue(
        detailSale({
          paidAmount: 9_500_000n,
          remainingAmount: 0n,
          paymentStatus: SalePaymentStatus.PAID,
          status: 'COMPLETED',
          payments: [
            ...detailSale().payments,
            {
              id: 'pay_3',
              amount: 4_500_000n,
              method: PaymentMethod.CASH,
              paidAt: new Date('2026-08-25T12:00:00.000Z'),
              isDeposit: false,
              note: null,
              createdAt: new Date('2026-08-25T12:00:00.000Z'),
              createdBy: WORKER,
            },
          ],
        }),
      );
    (prismaMock.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'pay_3' });
    (prismaMock.sale.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await saleService.addPayment(STORE_ID, ADMIN_ID, SALE_ID, {
      amount: 4_500_000,
      method: PaymentMethod.CASH,
    });

    const updateArgs = (prismaMock.sale.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(updateArgs.data.paidAmount).toBe(9_500_000n);
    expect(updateArgs.data.remainingAmount).toBe(0n);
    expect(updateArgs.data.paymentStatus).toBe(SalePaymentStatus.PAID);
    expect(updateArgs.data.status).toBe('COMPLETED');
    expect(result.sale.remainingAmount).toBe(0);
    expect(result.sale.paymentStatus).toBe(SalePaymentStatus.PAID);
  });

  it('rejects a payment greater than the remaining balance', async () => {
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(saleForPayment());

    await expect(
      saleService.addPayment(STORE_ID, ADMIN_ID, SALE_ID, {
        amount: 8_000_000,
        method: PaymentMethod.CASH,
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/remaining/i) });
  });

  it('does not find a sale from another store', async () => {
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      saleService.addPayment(OTHER_STORE, ADMIN_ID, SALE_ID, {
        amount: 1000,
        method: PaymentMethod.CASH,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('assembly assignment', () => {
  it('reassigns by cancelling the previous active task and creating a new one', async () => {
    const otherWorker = { ...ALI, id: 'user_bek', fullName: 'Bek' };
    (prismaMock.user.findFirst as ReturnType<typeof vi.fn>).mockImplementation(
      async ({ where }: { where: { id?: string; storeId?: string } }) => {
        if (where.storeId !== STORE_ID) return null;
        if (where.id === 'user_bek') return otherWorker;
        if (where.id === ALI_ID) return ALI;
        return WORKER;
      },
    );

    (prismaMock.assemblyTask.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'task_1', assigneeId: ALI_ID, status: AssemblyTaskStatus.PENDING },
    ]);
    (prismaMock.assemblyTask.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
    (prismaMock.assemblyTask.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'task_2' });
    (prismaMock.sale.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      detailSale({ installerId: 'user_bek' }),
    );

    await saleService.assignAssembly(STORE_ID, ADMIN_ID, SALE_ID, {
      assemblerId: 'user_bek',
    });

    expect(prismaMock.assemblyTask.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: AssemblyTaskStatus.CANCELLED },
      }),
    );
    expect(prismaMock.assemblyTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assigneeId: 'user_bek' }),
      }),
    );
  });

  it('completes an assembly task and updates the sale', async () => {
    const task = detailSale().assemblyTasks[0];
    (prismaMock.assemblyTask.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(task)
      .mockResolvedValue({
        ...task,
        status: AssemblyTaskStatus.COMPLETED,
        completedAt: new Date('2026-08-08T15:00:00.000Z'),
        completedById: ALI_ID,
        completedBy: ALI,
      });
    (prismaMock.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(ALI);
    (prismaMock.assemblyTask.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prismaMock.sale.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      detailSale({
        assemblyStatus: AssemblyTaskStatus.COMPLETED,
        installationStatus: FulfilmentStatus.COMPLETED,
      }),
    );

    const result = await saleService.updateAssemblyTask(STORE_ID, ALI_ID, 'task_1', {
      status: AssemblyTaskStatus.COMPLETED,
    });

    expect(prismaMock.assemblyTask.update).toHaveBeenCalled();
    expect(prismaMock.sale.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assemblyStatus: AssemblyTaskStatus.COMPLETED,
          installationStatus: FulfilmentStatus.COMPLETED,
        }),
      }),
    );
    expect(result.task.status).toBe(AssemblyTaskStatus.COMPLETED);
  });

  it('forbids a worker from completing someone else\'s task', async () => {
    (prismaMock.assemblyTask.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      detailSale().assemblyTasks[0],
    );
    (prismaMock.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...WORKER,
      id: 'user_other',
      role: UserRole.EMPLOYEE,
    });

    await expect(
      saleService.updateAssemblyTask(STORE_ID, 'user_other', 'task_1', {
        status: AssemblyTaskStatus.COMPLETED,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('store isolation', () => {
  it('returns not found when reading another store\'s sale', async () => {
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(saleService.getSale(OTHER_STORE, SALE_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('cancelSale', () => {
  beforeEach(() => {
    (prismaMock.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
    );
  });

  it('cancels an active sale for an admin and records activity', async () => {
    const existing = {
      ...detailSale(),
      items: [
        {
          productId: PRODUCT_ID,
          productName: PRODUCT.name,
          quantity: 1,
        },
      ],
      installmentPlan: null,
      assemblyTasks: [{ id: 'task_1' }],
    };
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(
        detailSale({
          status: 'CANCELLED',
          cancelledAt: new Date('2026-08-13T10:00:00.000Z'),
          cancelledById: ADMIN_ID,
          cancellationReason: 'Customer changed mind',
          cancelledBy: { id: ADMIN_ID, fullName: 'Admin', role: UserRole.ADMIN },
          assemblyTasks: [],
        }),
      );
    (prismaMock.sale.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prismaMock.assemblyTask.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
    (prismaMock.workerActivity.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prismaMock.product.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: PRODUCT_ID,
      trackStock: true,
      name: PRODUCT.name,
      stockQty: 9,
    });
    (prismaMock.stockMovement.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'mov_cancel',
      storeId: STORE_ID,
      productId: PRODUCT_ID,
      quantity: 1,
      quantityBefore: 9,
      quantityAfter: 10,
      movementType: 'SALE_CANCEL',
      referenceType: 'SALE',
      referenceId: SALE_ID,
      reason: 'Sale #123 cancelled',
      createdById: ADMIN_ID,
      createdAt: new Date(),
      product: { id: PRODUCT_ID, name: PRODUCT.name, sku: PRODUCT.sku },
      createdBy: null,
    });

    const sale = await saleService.cancelSale(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      SALE_ID,
      { reason: 'Customer changed mind' },
    );

    expect(sale.status).toBe('CANCELLED');
    expect(sale.cancellationReason).toBe('Customer changed mind');
    expect(prismaMock.sale.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancellationReason: 'Customer changed mind',
          cancelledById: ADMIN_ID,
        }),
      }),
    );
    expect(prismaMock.assemblyTask.updateMany).toHaveBeenCalled();
    expect(prismaMock.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          movementType: 'SALE_CANCEL',
          quantity: 1,
          referenceId: SALE_ID,
        }),
      }),
    );
    expect(prismaMock.workerActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'SALE_CANCELLED' }),
      }),
    );
  });

  it('rejects cancellation without a reason', async () => {
    await expect(
      saleService.cancelSale(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, SALE_ID, {
        reason: 'ab',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('forbids sellers from cancelling', async () => {
    await expect(
      saleService.cancelSale(STORE_ID, { id: SELLER_ID, role: UserRole.EMPLOYEE }, SALE_ID, {
        reason: 'Oops',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects double cancellation', async () => {
    (prismaMock.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
    );
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      detailSale({ status: 'CANCELLED', assemblyTasks: [] }),
    );

    await expect(
      saleService.cancelSale(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, SALE_ID, {
        reason: 'Already gone',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('returns 404 for another store', async () => {
    (prismaMock.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
    );
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      saleService.cancelSale(OTHER_STORE, { id: ADMIN_ID, role: UserRole.ADMIN }, SALE_ID, {
        reason: 'Wrong store',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('worker responsibility validation', () => {
  it('rejects a seller without SELLER responsibility', async () => {
    (prismaMock.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      saleService.createSale(STORE_ID, ADMIN_ID, {
        customerId: CUSTOMER_ID,
        sellerId: SELLER_ID,
        items: [{ productId: PRODUCT_ID, quantity: 1, unitCostPrice: 7_000_000, unitSalePrice: 9_500_000 }],
        paymentType: PaymentType.DEPOSIT,
        depositAmount: 0,
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('SELLER') });
  });

  it('rejects an assembler without ASSEMBLER responsibility', async () => {
    (prismaMock.user.findFirst as ReturnType<typeof vi.fn>).mockImplementation(
      async ({ where }: { where: { id?: string; responsibilities?: unknown } }) => {
        if (where.id === SELLER_ID || where.id === ADMIN_ID) return WORKER;
        return null;
      },
    );

    await expect(
      saleService.createSale(STORE_ID, ADMIN_ID, {
        customerId: CUSTOMER_ID,
        sellerId: SELLER_ID,
        assemblerId: ALI_ID,
        items: [{ productId: PRODUCT_ID, quantity: 1, unitCostPrice: 7_000_000, unitSalePrice: 9_500_000 }],
        paymentType: PaymentType.DEPOSIT,
        depositAmount: 0,
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('ASSEMBLER') });
  });

  it('rejects assigning an inactive worker', async () => {
    (prismaMock.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      saleService.assignAssembly(STORE_ID, ADMIN_ID, SALE_ID, { assemblerId: ALI_ID }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('manual worker compensation on sales', () => {
  it('persists MANUAL workerCompensation rows on create', async () => {
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ saleNumber: 200 })
      .mockResolvedValue(
        detailSale({
          workerCompensations: [
            {
              id: 'swc_1',
              storeId: STORE_ID,
              saleId: SALE_ID,
              workerId: SELLER_ID,
              role: SaleWorkerPayRole.SELLER,
              source: 'MANUAL',
              amount: 150_000n,
              createdAt: new Date(),
              updatedAt: new Date(),
              worker: { id: SELLER_ID, fullName: 'Sardor' },
            },
          ],
        }),
      );
    (prismaMock.sale.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: SALE_ID });
    (prismaMock.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'pay_1' });
    (prismaMock.saleWorkerCompensation.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 1,
    });

    const sale = await saleService.createSale(STORE_ID, ADMIN_ID, {
      customerId: CUSTOMER_ID,
      sellerId: SELLER_ID,
      items: [
        {
          productId: PRODUCT_ID,
          quantity: 1,
          unitCostPrice: 7_000_000,
          unitSalePrice: 9_500_000,
        },
      ],
      paymentType: PaymentType.DEPOSIT,
      depositAmount: 2_000_000,
      workerCompensation: [
        { role: SaleWorkerPayRole.SELLER, workerId: SELLER_ID, amount: 150_000 },
      ],
    });

    expect(prismaMock.saleWorkerCompensation.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          saleId: SALE_ID,
          workerId: SELLER_ID,
          role: SaleWorkerPayRole.SELLER,
          source: 'MANUAL',
          amount: 150_000n,
        }),
      ],
    });
    expect(sale.workerCompensation).toHaveLength(1);
    expect(sale.workerCompensation[0]?.amount).toBe(150_000);
    expect(sale.contributionAfterWorkerPay).toBe(2_350_000);
    expect(sale.netProfit).toBe(2_500_000);
  });

  it('replaces MANUAL rows on update when unlocked', async () => {
    (prismaMock.sale.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      detailSale({
        workerCompensations: [
          {
            id: 'swc_2',
            storeId: STORE_ID,
            saleId: SALE_ID,
            workerId: ALI_ID,
            role: SaleWorkerPayRole.ASSEMBLER,
            source: 'MANUAL',
            amount: 80_000n,
            createdAt: new Date(),
            updatedAt: new Date(),
            worker: { id: ALI_ID, fullName: 'Ali Usta' },
          },
        ],
      }),
    );

    const sale = await saleService.updateSale(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      SALE_ID,
      {
        workerCompensation: [
          { role: SaleWorkerPayRole.ASSEMBLER, workerId: ALI_ID, amount: 80_000 },
        ],
      },
    );

    expect(prismaMock.saleWorkerCompensation.deleteMany).toHaveBeenCalled();
    expect(prismaMock.saleWorkerCompensation.createMany).toHaveBeenCalled();
    expect(sale.workerCompensation[0]?.role).toBe(SaleWorkerPayRole.ASSEMBLER);
  });

  it('rejects workerCompensation edits after MANUAL settle (409)', async () => {
    (prismaMock.workerFinancialTransaction.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      { id: 'tx_settled' },
    );

    await expect(
      saleService.updateSale(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, SALE_ID, {
        workerCompensation: [
          { role: SaleWorkerPayRole.SELLER, workerId: SELLER_ID, amount: 10_000 },
        ],
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(prismaMock.saleWorkerCompensation.deleteMany).not.toHaveBeenCalled();
  });
});

describe('sale cost fees (usta / shopir)', () => {
  it('creates with zero fees by default', async () => {
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ saleNumber: 1 })
      .mockResolvedValue(detailSale());
    (prismaMock.sale.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: SALE_ID });
    (prismaMock.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'pay_1' });

    await saleService.createSale(STORE_ID, ADMIN_ID, {
      customerId: CUSTOMER_ID,
      sellerId: SELLER_ID,
      items: [
        {
          productId: PRODUCT_ID,
          quantity: 1,
          unitCostPrice: 7_000_000,
          unitSalePrice: 9_500_000,
        },
      ],
      paymentType: PaymentType.DEPOSIT,
      depositAmount: 2_000_000,
    });

    const createArgs = (prismaMock.sale.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(createArgs.data.installationCost).toBe(0n);
    expect(createArgs.data.deliveryCost).toBe(0n);
    expect(createArgs.data.netProfit).toBe(2_500_000n);
  });

  it('persists assemblerFee / driverFee as installationCost / deliveryCost and reduces netProfit', async () => {
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ saleNumber: 2 })
      .mockResolvedValue(
        detailSale({
          installationCost: 300_000n,
          deliveryCost: 150_000n,
          netProfit: 2_050_000n,
        }),
      );
    (prismaMock.sale.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: SALE_ID });
    (prismaMock.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'pay_1' });

    const sale = await saleService.createSale(STORE_ID, ADMIN_ID, {
      customerId: CUSTOMER_ID,
      sellerId: SELLER_ID,
      items: [
        {
          productId: PRODUCT_ID,
          quantity: 1,
          unitCostPrice: 7_000_000,
          unitSalePrice: 9_500_000,
        },
      ],
      paymentType: PaymentType.DEPOSIT,
      depositAmount: 2_000_000,
      assemblerFee: 300_000,
      driverFee: 150_000,
    });

    const createArgs = (prismaMock.sale.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(createArgs.data.installationCost).toBe(300_000n);
    expect(createArgs.data.deliveryCost).toBe(150_000n);
    expect(createArgs.data.netProfit).toBe(2_050_000n);
    expect(sale.assemblerFee).toBe(300_000);
    expect(sale.driverFee).toBe(150_000);
    expect(sale.installationCost).toBe(300_000);
    expect(sale.deliveryCost).toBe(150_000);
  });

  it('creates with usta only', async () => {
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ saleNumber: 3 })
      .mockResolvedValue(detailSale({ installationCost: 300_000n, netProfit: 2_200_000n }));
    (prismaMock.sale.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: SALE_ID });
    (prismaMock.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'pay_1' });

    await saleService.createSale(STORE_ID, ADMIN_ID, {
      customerId: CUSTOMER_ID,
      sellerId: SELLER_ID,
      items: [
        {
          productId: PRODUCT_ID,
          quantity: 1,
          unitCostPrice: 7_000_000,
          unitSalePrice: 9_500_000,
        },
      ],
      paymentType: PaymentType.DEPOSIT,
      depositAmount: 2_000_000,
      assemblerFee: 300_000,
    });

    const createArgs = (prismaMock.sale.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(createArgs.data.installationCost).toBe(300_000n);
    expect(createArgs.data.deliveryCost).toBe(0n);
    expect(createArgs.data.netProfit).toBe(2_200_000n);
  });

  it('creates with shopir only', async () => {
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ saleNumber: 4 })
      .mockResolvedValue(detailSale({ deliveryCost: 150_000n, netProfit: 2_350_000n }));
    (prismaMock.sale.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: SALE_ID });
    (prismaMock.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'pay_1' });

    await saleService.createSale(STORE_ID, ADMIN_ID, {
      customerId: CUSTOMER_ID,
      sellerId: SELLER_ID,
      items: [
        {
          productId: PRODUCT_ID,
          quantity: 1,
          unitCostPrice: 7_000_000,
          unitSalePrice: 9_500_000,
        },
      ],
      paymentType: PaymentType.DEPOSIT,
      depositAmount: 2_000_000,
      driverFee: 150_000,
    });

    const createArgs = (prismaMock.sale.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(createArgs.data.installationCost).toBe(0n);
    expect(createArgs.data.deliveryCost).toBe(150_000n);
    expect(createArgs.data.netProfit).toBe(2_350_000n);
  });

  it('allows admin to update fees and forbids employees (403)', async () => {
    (prismaMock.saleItem.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        quantity: 1,
        unitCostPrice: 7_000_000n,
        unitSalePrice: 9_500_000n,
      },
    ]);
    (prismaMock.sale.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      detailSale({
        installationCost: 300_000n,
        deliveryCost: 100_000n,
        netProfit: 2_100_000n,
      }),
    );

    const updated = await saleService.updateSale(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      SALE_ID,
      { assemblerFee: 300_000, driverFee: 100_000 },
    );
    expect(updated.assemblerFee).toBe(300_000);
    expect(prismaMock.sale.update).toHaveBeenCalled();

    await expect(
      saleService.updateSale(
        STORE_ID,
        { id: SELLER_ID, role: UserRole.EMPLOYEE },
        SALE_ID,
        { assemblerFee: 50_000 },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('isolates fee updates by store (404 for other store)', async () => {
    (prismaMock.sale.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      saleService.updateSale(
        OTHER_STORE,
        { id: ADMIN_ID, role: UserRole.ADMIN },
        SALE_ID,
        { driverFee: 10_000 },
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
