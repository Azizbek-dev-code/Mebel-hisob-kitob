import { SaleStatus, SellerCommissionStatus } from '@furniture-erp/shared';
import { describe, expect, it } from 'vitest';

import { deriveSellerCommissionStatus } from './seller-commission.service.js';

describe('deriveSellerCommissionStatus', () => {
  it('marks cancelled sales as CANCELLED', () => {
    expect(
      deriveSellerCommissionStatus({
        saleStatus: SaleStatus.CANCELLED,
        estimated: 300_000,
        earned: 0,
        reversed: true,
        workerPaid: 0,
        workerEarned: 0,
      }),
    ).toBe(SellerCommissionStatus.CANCELLED);
  });

  it('marks posted unpaid commission as EARNED', () => {
    expect(
      deriveSellerCommissionStatus({
        saleStatus: SaleStatus.ACTIVE,
        estimated: 300_000,
        earned: 300_000,
        reversed: false,
        workerPaid: 0,
        workerEarned: 300_000,
      }),
    ).toBe(SellerCommissionStatus.EARNED);
  });

  it('marks partial worker payment as PARTIALLY_PAID', () => {
    expect(
      deriveSellerCommissionStatus({
        saleStatus: SaleStatus.ACTIVE,
        estimated: 300_000,
        earned: 300_000,
        reversed: false,
        workerPaid: 150_000,
        workerEarned: 600_000,
      }),
    ).toBe(SellerCommissionStatus.PARTIALLY_PAID);
  });

  it('marks fully paid worker as PAID', () => {
    expect(
      deriveSellerCommissionStatus({
        saleStatus: SaleStatus.COMPLETED,
        estimated: 300_000,
        earned: 300_000,
        reversed: false,
        workerPaid: 600_000,
        workerEarned: 600_000,
      }),
    ).toBe(SellerCommissionStatus.PAID);
  });
});
