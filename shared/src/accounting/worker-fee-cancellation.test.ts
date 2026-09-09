import { describe, expect, it } from 'vitest';

import { WorkerResponsibility } from '../constants/enums.js';
import {
  classifySaleWorkerFeeRef,
  isEarnedPurchaseDriverFee,
  isEarnedSaleWorkerFee,
  type SaleWorkCompletion,
} from './worker-fee-cancellation.js';

const SALE_ID = 'sale_1';

const NOTHING_DONE: SaleWorkCompletion = {
  assemblyCompleted: false,
  installationCompleted: false,
  deliveryCompleted: false,
};

const ALL_DONE: SaleWorkCompletion = {
  assemblyCompleted: true,
  installationCompleted: true,
  deliveryCompleted: true,
};

describe('classifySaleWorkerFeeRef', () => {
  it('classifies current operational fee refs', () => {
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:ASSEMBLY_FEE`)).toBe('ASSEMBLY');
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:INSTALLER_FEE`)).toBe('INSTALLER');
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:DELIVERY_FEE`)).toBe('DELIVERY');
  });

  it('classifies legacy and interim refs the same way', () => {
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:INSTALLATION_COST`)).toBe('ASSEMBLY');
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:ASSEMBLY:FEE`)).toBe('ASSEMBLY');
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:INSTALLATION:FEE`)).toBe('INSTALLER');
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:DELIVERY_COST`)).toBe('DELIVERY');
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:DELIVERY:FEE`)).toBe('DELIVERY');
  });

  it('classifies compensation settle refs by the work they pay for', () => {
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:MANUAL:ASSEMBLER`)).toBe('ASSEMBLY');
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:MANUAL:SHOPIR`)).toBe('DELIVERY');
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:MANUAL:DASTAFCHI`)).toBe('DELIVERY');
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:FIXED_PER_INSTALLATION`)).toBe('INSTALLER');
    expect(classifySaleWorkerFeeRef('task_9:FIXED_PER_ASSEMBLY')).toBe('ASSEMBLY');
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:FIXED_PER_ASSEMBLY:task_9`)).toBe('ASSEMBLY');
  });

  it('classifies seller compensation refs as SELLER', () => {
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:MANUAL:SELLER`)).toBe('SELLER');
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:PERCENT_OF_SALE`)).toBe('SELLER');
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:PERCENT_OF_GROSS_PROFIT`)).toBe('SELLER');
    expect(classifySaleWorkerFeeRef(`${SALE_ID}:FIXED_PER_SALE`)).toBe('SELLER');
  });

  it('falls back to responsibility for unknown ref shapes', () => {
    expect(classifySaleWorkerFeeRef('weird_ref', WorkerResponsibility.ASSEMBLER)).toBe('ASSEMBLY');
    expect(classifySaleWorkerFeeRef('weird_ref', WorkerResponsibility.DELIVERY)).toBe('DELIVERY');
    expect(classifySaleWorkerFeeRef('weird_ref', WorkerResponsibility.INSTALLER)).toBe('INSTALLER');
    expect(classifySaleWorkerFeeRef('weird_ref', WorkerResponsibility.SELLER)).toBe('SELLER');
    expect(classifySaleWorkerFeeRef('weird_ref')).toBe('OTHER');
    expect(classifySaleWorkerFeeRef(null)).toBe('OTHER');
  });
});

describe('isEarnedSaleWorkerFee', () => {
  it('keeps usta fee when assembly is completed', () => {
    expect(
      isEarnedSaleWorkerFee({
        referenceId: `${SALE_ID}:ASSEMBLY_FEE`,
        completion: { ...NOTHING_DONE, assemblyCompleted: true },
      }),
    ).toBe(true);
  });

  it('does not protect usta fee when assembly is not completed', () => {
    expect(
      isEarnedSaleWorkerFee({ referenceId: `${SALE_ID}:ASSEMBLY_FEE`, completion: NOTHING_DONE }),
    ).toBe(false);
  });

  it('keeps shopir fee when delivery is completed', () => {
    expect(
      isEarnedSaleWorkerFee({
        referenceId: `${SALE_ID}:DELIVERY_FEE`,
        completion: { ...NOTHING_DONE, deliveryCompleted: true },
      }),
    ).toBe(true);
    expect(
      isEarnedSaleWorkerFee({ referenceId: `${SALE_ID}:DELIVERY_FEE`, completion: NOTHING_DONE }),
    ).toBe(false);
  });

  it('keeps installer fee when installation is completed', () => {
    expect(
      isEarnedSaleWorkerFee({
        referenceId: `${SALE_ID}:INSTALLER_FEE`,
        completion: { ...NOTHING_DONE, installationCompleted: true },
      }),
    ).toBe(true);
  });

  it('never protects seller commission — it follows the sale result', () => {
    expect(
      isEarnedSaleWorkerFee({ referenceId: `${SALE_ID}:PERCENT_OF_SALE`, completion: ALL_DONE }),
    ).toBe(false);
    expect(
      isEarnedSaleWorkerFee({ referenceId: `${SALE_ID}:MANUAL:SELLER`, completion: ALL_DONE }),
    ).toBe(false);
  });

  it('does not protect unknown refs', () => {
    expect(isEarnedSaleWorkerFee({ referenceId: 'weird_ref', completion: ALL_DONE })).toBe(false);
  });
});

describe('isEarnedPurchaseDriverFee', () => {
  it('is earned once the goods arrived at the store', () => {
    expect(isEarnedPurchaseDriverFee({ deliveredAt: new Date('2026-01-05') })).toBe(true);
    expect(isEarnedPurchaseDriverFee({ deliveredAt: '2026-01-05T00:00:00.000Z' })).toBe(true);
  });

  it('is not earned while the goods are still on the way', () => {
    expect(isEarnedPurchaseDriverFee({ deliveredAt: null })).toBe(false);
    expect(isEarnedPurchaseDriverFee({ deliveredAt: undefined })).toBe(false);
  });
});
