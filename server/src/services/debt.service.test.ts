import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listDebtsMock, addPaymentMock } = vi.hoisted(() => ({
  listDebtsMock: vi.fn(),
  addPaymentMock: vi.fn(),
}));

vi.mock('../repositories/debt.repository.js', () => ({
  listDebts: listDebtsMock,
}));

vi.mock('./sale.service.js', () => ({
  addPayment: addPaymentMock,
}));

import * as debtService from './debt.service.js';

describe('debt.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists debts for the caller's store only via repository", async () => {
    listDebtsMock.mockResolvedValue({
      summary: {
        totalOutstanding: 1_000_000,
        customersInDebt: 1,
        openSaleCount: 1,
        overdueInstallmentCount: 0,
        overdueAmount: 0,
      },
      items: [],
      meta: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const result = await debtService.listDebts('store_a', { page: 1 });
    expect(listDebtsMock).toHaveBeenCalledWith('store_a', { page: 1 });
    expect(result.summary.totalOutstanding).toBe(1_000_000);
  });

  it('records debt payments through addPayment', async () => {
    addPaymentMock.mockResolvedValue({
      sale: { id: 'sale_1', remainingAmount: 0 },
      payment: { id: 'pay_1', amount: 500_000 },
    });

    const result = await debtService.recordDebtPayment('store_a', 'user_1', 'sale_1', {
      amount: 500_000,
      method: 'CASH',
    });

    expect(addPaymentMock).toHaveBeenCalledWith('store_a', 'user_1', 'sale_1', {
      amount: 500_000,
      method: 'CASH',
    });
    expect(result.payment.amount).toBe(500_000);
  });
});
