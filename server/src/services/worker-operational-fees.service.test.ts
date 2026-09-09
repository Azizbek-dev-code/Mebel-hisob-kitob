import {
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { financialRepoMock } = vi.hoisted(() => ({
  financialRepoMock: {
    findOpenCommissionByRef: vi.fn(),
    createTransaction: vi.fn(),
    findReversalOf: vi.fn(),
    closeOpenCommission: vi.fn(),
    findOpenSaleOperationalFeeCommissions: vi.fn(),
    findOpenPurchaseDriverFeeCommission: vi.fn(),
  },
}));

vi.mock('../repositories/worker-financial.repository.js', () => financialRepoMock);

const {
  postAssemblyFeeOnComplete,
  postDeliveryFeeOnComplete,
  postInstallerFeeOnComplete,
  postPurchaseDriverFee,
  reversePurchaseDriverFee,
  reverseSaleOperationalFees,
} = await import('./worker-operational-fees.service.js');

const TX = {} as never;

const NOTHING_COMPLETED = {
  assemblyCompleted: false,
  installationCompleted: false,
  deliveryCompleted: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  financialRepoMock.findOpenCommissionByRef.mockResolvedValue(null);
  financialRepoMock.findReversalOf.mockResolvedValue(null);
  financialRepoMock.createTransaction.mockResolvedValue({ id: 'tx_1' });
  financialRepoMock.closeOpenCommission.mockResolvedValue(undefined);
  financialRepoMock.findOpenSaleOperationalFeeCommissions.mockResolvedValue([]);
  financialRepoMock.findOpenPurchaseDriverFeeCommission.mockResolvedValue(null);
});

describe('worker-operational-fees', () => {
  it('posts assembly and installer fees on separate refs', async () => {
    const assembly = await postAssemblyFeeOnComplete({
      storeId: 'store_1',
      saleId: 'sale_1',
      saleNumber: 5,
      workerId: 'usta_1',
      assemblyFee: 340_000,
      productSummary: 'Xontaxta',
      actorId: 'admin_1',
      client: TX,
    });
    expect(assembly).toBe(true);
    expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WorkerFinancialTransactionType.COMMISSION,
        referenceType: WorkerFinancialReferenceType.ASSEMBLY,
        referenceId: 'sale_1:ASSEMBLY_FEE',
        amount: 340_000,
        workerId: 'usta_1',
      }),
      TX,
    );

    const installer = await postInstallerFeeOnComplete({
      storeId: 'store_1',
      saleId: 'sale_1',
      saleNumber: 5,
      workerId: 'installer_1',
      installerFee: 200_000,
      productSummary: 'Xontaxta',
      actorId: 'admin_1',
      client: TX,
    });
    expect(installer).toBe(true);
    expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceType: WorkerFinancialReferenceType.ASSEMBLY,
        referenceId: 'sale_1:INSTALLER_FEE',
        amount: 200_000,
        workerId: 'installer_1',
      }),
      TX,
    );
  });

  it('skips duplicate assembly completion', async () => {
    await postAssemblyFeeOnComplete({
      storeId: 'store_1',
      saleId: 'sale_1',
      saleNumber: 5,
      workerId: 'usta_1',
      assemblyFee: 340_000,
      actorId: 'admin_1',
      client: TX,
    });
    financialRepoMock.findOpenCommissionByRef.mockResolvedValue({ id: 'tx_1' });
    const second = await postAssemblyFeeOnComplete({
      storeId: 'store_1',
      saleId: 'sale_1',
      saleNumber: 5,
      workerId: 'usta_1',
      assemblyFee: 340_000,
      actorId: 'admin_1',
      client: TX,
    });
    expect(second).toBe(false);
    expect(financialRepoMock.createTransaction).toHaveBeenCalledTimes(1);
  });

  it('posts delivery and purchase fees with distinct refs', async () => {
    await postDeliveryFeeOnComplete({
      storeId: 'store_1',
      saleId: 'sale_2',
      saleNumber: 8,
      workerId: 'shopir_1',
      deliveryCost: 150_000n,
      actorId: 'admin_1',
      client: TX,
    });
    expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceType: WorkerFinancialReferenceType.SALE,
        referenceId: 'sale_2:DELIVERY_FEE',
        amount: 150_000,
      }),
      TX,
    );

    await postPurchaseDriverFee({
      storeId: 'store_1',
      purchaseId: 'pur_1',
      purchaseNumber: 3,
      workerId: 'shopir_1',
      driverFee: 150_000,
      supplierName: 'Shermat aka',
      actorId: 'admin_1',
      client: TX,
    });
    expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceType: WorkerFinancialReferenceType.PURCHASE,
        referenceId: 'pur_1:DRIVER_FEE',
        amount: 150_000,
      }),
      TX,
    );
  });

  it('skips zero amount and missing worker', async () => {
    expect(
      await postInstallerFeeOnComplete({
        storeId: 'store_1',
        saleId: 'sale_1',
        saleNumber: 1,
        workerId: null,
        installerFee: 100,
        actorId: 'admin_1',
        client: TX,
      }),
    ).toBe(false);
    expect(
      await postInstallerFeeOnComplete({
        storeId: 'store_1',
        saleId: 'sale_1',
        saleNumber: 1,
        workerId: 'worker_1',
        installerFee: 0,
        actorId: 'admin_1',
        client: TX,
      }),
    ).toBe(false);
    expect(financialRepoMock.createTransaction).not.toHaveBeenCalled();
  });

  it('reverses unearned sale operational fees without double reverse', async () => {
    financialRepoMock.findOpenSaleOperationalFeeCommissions.mockResolvedValue([
      {
        id: 'tx_fee',
        workerId: 'worker_1',
        amount: 340_000n,
        type: WorkerFinancialTransactionType.COMMISSION,
        description: 'Usta haqqi',
        referenceId: 'sale_1:ASSEMBLY_FEE',
        responsibility: 'ASSEMBLER',
      },
    ]);

    await reverseSaleOperationalFees({
      storeId: 'store_1',
      saleId: 'sale_1',
      saleNumber: 5,
      completion: NOTHING_COMPLETED,
      actorId: 'admin_1',
      client: TX,
    });

    expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WorkerFinancialTransactionType.REVERSAL,
        referenceType: WorkerFinancialReferenceType.REVERSAL,
        referenceId: 'tx_fee',
        amount: 340_000,
        description: expect.stringContaining('minus'),
      }),
      TX,
    );

    financialRepoMock.findReversalOf.mockResolvedValue({ id: 'tx_rev' });
    await reverseSaleOperationalFees({
      storeId: 'store_1',
      saleId: 'sale_1',
      saleNumber: 5,
      completion: NOTHING_COMPLETED,
      actorId: 'admin_1',
      client: TX,
    });
    expect(financialRepoMock.createTransaction).toHaveBeenCalledTimes(1);
  });

  it('reverses settled seller compensation commissions for the sale', async () => {
    financialRepoMock.findOpenSaleOperationalFeeCommissions.mockResolvedValue([
      {
        id: 'tx_seller',
        workerId: 'seller_1',
        amount: 150_000n,
        type: WorkerFinancialTransactionType.COMMISSION,
        description: 'Komissiya · Sotuv #5',
        referenceId: 'sale_1:PERCENT_OF_GROSS_PROFIT',
        responsibility: 'SELLER',
      },
    ]);

    await reverseSaleOperationalFees({
      storeId: 'store_1',
      saleId: 'sale_1',
      saleNumber: 5,
      completion: NOTHING_COMPLETED,
      actorId: 'admin_1',
      client: TX,
    });

    expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WorkerFinancialTransactionType.REVERSAL,
        referenceId: 'tx_seller',
        amount: 150_000,
      }),
      TX,
    );
  });

  it('reverses seller commission at the original posted amount (not a recalculated net base)', async () => {
    financialRepoMock.findOpenSaleOperationalFeeCommissions.mockResolvedValue([
      {
        id: 'tx_seller_450',
        workerId: 'seller_1',
        amount: 450_000n,
        type: WorkerFinancialTransactionType.COMMISSION,
        description: 'Komissiya · Sotuv #13 · Yalpi foyda 3 000 000 · Stavka 15%',
        referenceId: 'sale_13:PERCENT_OF_GROSS_PROFIT',
        responsibility: 'SELLER',
      },
    ]);

    await reverseSaleOperationalFees({
      storeId: 'store_1',
      saleId: 'sale_13',
      saleNumber: 13,
      // Seller commission is reversed even when the physical work was done.
      completion: {
        assemblyCompleted: true,
        installationCompleted: true,
        deliveryCompleted: true,
      },
      actorId: 'admin_1',
      client: TX,
    });

    expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WorkerFinancialTransactionType.REVERSAL,
        referenceId: 'tx_seller_450',
        amount: 450_000,
      }),
      TX,
    );
  });

  describe('cancellation keeps fees for work that was completed', () => {
    const usta = {
      id: 'tx_usta',
      workerId: 'usta_1',
      amount: 300_000n,
      type: WorkerFinancialTransactionType.COMMISSION,
      description: 'Usta haqqi · Sotuv #8',
      referenceId: 'sale_8:ASSEMBLY_FEE',
      responsibility: 'ASSEMBLER',
    };
    const shopir = {
      id: 'tx_shopir',
      workerId: 'shopir_1',
      amount: 130_000n,
      type: WorkerFinancialTransactionType.COMMISSION,
      description: 'Yetkazib berish haqi · Sotuv #8',
      referenceId: 'sale_8:DELIVERY_FEE',
      responsibility: 'DELIVERY',
    };
    const seller = {
      id: 'tx_seller',
      workerId: 'seller_1',
      amount: 400_000n,
      type: WorkerFinancialTransactionType.COMMISSION,
      description: 'Komissiya · Sotuv #8',
      referenceId: 'sale_8:PERCENT_OF_GROSS_PROFIT',
      responsibility: 'SELLER',
    };

    async function cancelSaleFees(completion = NOTHING_COMPLETED) {
      return reverseSaleOperationalFees({
        storeId: 'store_1',
        saleId: 'sale_8',
        saleNumber: 8,
        completion,
        actorId: 'admin_1',
        client: TX,
      });
    }

    it('keeps the usta fee when assembly was completed', async () => {
      financialRepoMock.findOpenSaleOperationalFeeCommissions.mockResolvedValue([usta]);

      expect(
        await cancelSaleFees({ ...NOTHING_COMPLETED, assemblyCompleted: true }),
      ).toEqual({ reversed: 0, preserved: 1 });
      expect(financialRepoMock.createTransaction).not.toHaveBeenCalled();
      expect(financialRepoMock.closeOpenCommission).not.toHaveBeenCalled();
    });

    it('keeps the shopir fee when delivery was completed', async () => {
      financialRepoMock.findOpenSaleOperationalFeeCommissions.mockResolvedValue([shopir]);

      expect(
        await cancelSaleFees({ ...NOTHING_COMPLETED, deliveryCompleted: true }),
      ).toEqual({ reversed: 0, preserved: 1 });
      expect(financialRepoMock.createTransaction).not.toHaveBeenCalled();
    });

    it('keeps the installer fee when installation was completed', async () => {
      financialRepoMock.findOpenSaleOperationalFeeCommissions.mockResolvedValue([
        {
          ...usta,
          id: 'tx_installer',
          referenceId: 'sale_8:INSTALLER_FEE',
          responsibility: 'INSTALLER',
        },
      ]);

      expect(
        await cancelSaleFees({ ...NOTHING_COMPLETED, installationCompleted: true }),
      ).toEqual({ reversed: 0, preserved: 1 });
      expect(financialRepoMock.createTransaction).not.toHaveBeenCalled();
    });

    it('reverses fees for work that never happened', async () => {
      financialRepoMock.findOpenSaleOperationalFeeCommissions.mockResolvedValue([usta, shopir]);

      expect(await cancelSaleFees()).toEqual({ reversed: 2, preserved: 0 });
      expect(financialRepoMock.createTransaction).toHaveBeenCalledTimes(2);
    });

    it('keeps completed operational fees but still reverses seller commission', async () => {
      financialRepoMock.findOpenSaleOperationalFeeCommissions.mockResolvedValue([
        usta,
        shopir,
        seller,
      ]);

      expect(
        await cancelSaleFees({
          assemblyCompleted: true,
          installationCompleted: false,
          deliveryCompleted: true,
        }),
      ).toEqual({ reversed: 1, preserved: 2 });
      expect(financialRepoMock.createTransaction).toHaveBeenCalledTimes(1);
      expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ referenceId: 'tx_seller', amount: 400_000 }),
        TX,
      );
    });

    it('is a no-op for earned fees when cancel runs twice', async () => {
      financialRepoMock.findOpenSaleOperationalFeeCommissions.mockResolvedValue([usta, shopir]);
      const completion = {
        assemblyCompleted: true,
        installationCompleted: false,
        deliveryCompleted: true,
      };

      await cancelSaleFees(completion);
      await cancelSaleFees(completion);
      expect(financialRepoMock.createTransaction).not.toHaveBeenCalled();
    });

    it('keeps the purchase shopir fee once the goods arrived', async () => {
      financialRepoMock.findOpenPurchaseDriverFeeCommission.mockResolvedValue({
        id: 'tx_driver',
        workerId: 'shopir_1',
        amount: 150_000n,
        type: WorkerFinancialTransactionType.COMMISSION,
        description: 'Kirim shopir haqqi · Kirim #4',
        referenceId: 'pur_1:DRIVER_FEE',
        responsibility: 'DELIVERY',
      });

      expect(
        await reversePurchaseDriverFee({
          storeId: 'store_1',
          purchaseId: 'pur_1',
          purchaseNumber: 4,
          deliveredAt: new Date('2026-02-01'),
          actorId: 'admin_1',
          client: TX,
        }),
      ).toEqual({ reversed: 0, preserved: 1 });
      expect(financialRepoMock.createTransaction).not.toHaveBeenCalled();
    });

    it('reverses the purchase shopir fee while the goods are still on the way', async () => {
      financialRepoMock.findOpenPurchaseDriverFeeCommission.mockResolvedValue({
        id: 'tx_driver',
        workerId: 'shopir_1',
        amount: 150_000n,
        type: WorkerFinancialTransactionType.COMMISSION,
        description: 'Kirim shopir haqqi · Kirim #4',
        referenceId: 'pur_1:DRIVER_FEE',
        responsibility: 'DELIVERY',
      });

      expect(
        await reversePurchaseDriverFee({
          storeId: 'store_1',
          purchaseId: 'pur_1',
          purchaseNumber: 4,
          deliveredAt: null,
          actorId: 'admin_1',
          client: TX,
        }),
      ).toEqual({ reversed: 1, preserved: 0 });
      expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: WorkerFinancialTransactionType.REVERSAL,
          referenceId: 'tx_driver',
          amount: 150_000,
        }),
        TX,
      );
    });
  });

  describe('multi-responsibility double-pay prevention', () => {
    const SAME_WORKER = 'multi_1';

    it('SELLER+ASSEMBLER: assembly fee and seller commission stay separate refs', async () => {
      await postAssemblyFeeOnComplete({
        storeId: 'store_1',
        saleId: 'sale_m1',
        saleNumber: 10,
        workerId: SAME_WORKER,
        assemblyFee: 500_000,
        actorId: 'admin_1',
        client: TX,
      });

      expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          workerId: SAME_WORKER,
          amount: 500_000,
          referenceId: 'sale_m1:ASSEMBLY_FEE',
          responsibility: 'ASSEMBLER',
        }),
        TX,
      );

      // Seller commission is COMPENSATION settle — not an operational ASSEMBLY/DELIVERY fee.
      // Completing assembly again must not post a second 500k as "seller".
      financialRepoMock.findOpenCommissionByRef.mockResolvedValue({ id: 'tx_asm' });
      const second = await postAssemblyFeeOnComplete({
        storeId: 'store_1',
        saleId: 'sale_m1',
        saleNumber: 10,
        workerId: SAME_WORKER,
        assemblyFee: 500_000,
        actorId: 'admin_1',
        client: TX,
      });
      expect(second).toBe(false);
      expect(financialRepoMock.createTransaction).toHaveBeenCalledTimes(1);
    });

    it('SELLER+DELIVERY: delivery fee posts once under DELIVERY responsibility', async () => {
      await postDeliveryFeeOnComplete({
        storeId: 'store_1',
        saleId: 'sale_m2',
        saleNumber: 11,
        workerId: SAME_WORKER,
        deliveryCost: 150_000,
        actorId: 'admin_1',
        client: TX,
      });
      expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          workerId: SAME_WORKER,
          amount: 150_000,
          referenceId: 'sale_m2:DELIVERY_FEE',
          responsibility: 'DELIVERY',
        }),
        TX,
      );
      financialRepoMock.findOpenCommissionByRef.mockResolvedValue({ id: 'tx_del' });
      expect(
        await postDeliveryFeeOnComplete({
          storeId: 'store_1',
          saleId: 'sale_m2',
          saleNumber: 11,
          workerId: SAME_WORKER,
          deliveryCost: 150_000,
          actorId: 'admin_1',
          client: TX,
        }),
      ).toBe(false);
    });

    it('SELLER+INSTALLER: installer fee posts once under INSTALLER', async () => {
      await postInstallerFeeOnComplete({
        storeId: 'store_1',
        saleId: 'sale_m3',
        saleNumber: 12,
        workerId: SAME_WORKER,
        installerFee: 200_000,
        actorId: 'admin_1',
        client: TX,
      });
      expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          workerId: SAME_WORKER,
          amount: 200_000,
          referenceId: 'sale_m3:INSTALLER_FEE',
          responsibility: 'INSTALLER',
        }),
        TX,
      );
    });

    it('SELLER+ASSEMBLER+DELIVERY+INSTALLER: four distinct open commissions on same worker', async () => {
      financialRepoMock.findOpenCommissionByRef.mockResolvedValue(null);
      financialRepoMock.createTransaction.mockImplementation(async (data: { referenceId: string }) => ({
        id: `tx_${data.referenceId}`,
      }));

      await postAssemblyFeeOnComplete({
        storeId: 'store_1',
        saleId: 'sale_all',
        saleNumber: 99,
        workerId: SAME_WORKER,
        assemblyFee: 500_000,
        actorId: 'admin_1',
        client: TX,
      });
      await postDeliveryFeeOnComplete({
        storeId: 'store_1',
        saleId: 'sale_all',
        saleNumber: 99,
        workerId: SAME_WORKER,
        deliveryCost: 150_000,
        actorId: 'admin_1',
        client: TX,
      });
      await postInstallerFeeOnComplete({
        storeId: 'store_1',
        saleId: 'sale_all',
        saleNumber: 99,
        workerId: SAME_WORKER,
        installerFee: 200_000,
        actorId: 'admin_1',
        client: TX,
      });

      const creates = financialRepoMock.createTransaction.mock.calls.map(
        (c: unknown[]) => c[0] as { amount: number; referenceId: string; responsibility: string },
      );
      expect(creates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            amount: 500_000,
            referenceId: 'sale_all:ASSEMBLY_FEE',
            responsibility: 'ASSEMBLER',
          }),
          expect.objectContaining({
            amount: 150_000,
            referenceId: 'sale_all:DELIVERY_FEE',
            responsibility: 'DELIVERY',
          }),
          expect.objectContaining({
            amount: 200_000,
            referenceId: 'sale_all:INSTALLER_FEE',
            responsibility: 'INSTALLER',
          }),
        ]),
      );
      const totalOperational = creates
        .filter((c) => String(c.referenceId).startsWith('sale_all:'))
        .reduce((s, c) => s + c.amount, 0);
      // Assembly + delivery + installer = 850k — seller 300k would be separate COMPENSATION settle.
      expect(totalOperational).toBe(850_000);
    });
  });
});
