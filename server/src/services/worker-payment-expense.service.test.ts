import { ExpenseStatus, WorkerResponsibility } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    expense: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    expenseCategory: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { postExpenseForWorkerPayment, voidExpenseForWorkerPayment } = await import(
  './worker-payment-expense.service.js'
);

const STORE = 'store_1';
const PAYMENT = {
  id: 'pay_1',
  amount: 150_000,
  transactionDate: '2026-09-20T00:00:00.000Z',
  description: 'Yetkazib berish',
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.expense.findFirst.mockResolvedValue(null);
  prismaMock.expense.create.mockResolvedValue({ id: 'exp_1' });
  prismaMock.expense.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.expenseCategory.findFirst.mockResolvedValue({ id: 'cat_delivery' });
});

describe('worker-payment-expense', () => {
  it('posts one ACTIVE expense for a PAYMENT and skips a second post', async () => {
    await postExpenseForWorkerPayment({
      storeId: STORE,
      payment: PAYMENT,
      workerName: 'Azizbek',
      responsibility: WorkerResponsibility.DELIVERY,
      createdById: 'admin_1',
    });

    expect(prismaMock.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeId: STORE,
          workerPaymentId: PAYMENT.id,
          status: ExpenseStatus.ACTIVE,
        }),
      }),
    );

    prismaMock.expense.findFirst.mockResolvedValue({ id: 'exp_1' });
    await postExpenseForWorkerPayment({
      storeId: STORE,
      payment: PAYMENT,
      workerName: 'Azizbek',
      responsibility: WorkerResponsibility.DELIVERY,
      createdById: 'admin_1',
    });
    expect(prismaMock.expense.create).toHaveBeenCalledTimes(1);
  });

  it('voids the linked expense when a PAYMENT is reversed', async () => {
    await voidExpenseForWorkerPayment({
      storeId: STORE,
      paymentId: PAYMENT.id,
      cancelledById: 'admin_1',
    });
    expect(prismaMock.expense.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          storeId: STORE,
          workerPaymentId: PAYMENT.id,
          status: ExpenseStatus.ACTIVE,
        },
      }),
    );
  });
});
