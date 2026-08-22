import { deriveStockStatus, StockStatus } from '@furniture-erp/shared';
import { describe, expect, it } from 'vitest';

describe('deriveStockStatus', () => {
  it('returns NOT_TRACKED when tracking is disabled', () => {
    expect(
      deriveStockStatus({ trackStock: false, stockQty: 0, minStockQty: 2 }),
    ).toBe(StockStatus.NOT_TRACKED);
  });

  it('returns OUT_OF_STOCK when quantity is zero', () => {
    expect(
      deriveStockStatus({ trackStock: true, stockQty: 0, minStockQty: 2 }),
    ).toBe(StockStatus.OUT_OF_STOCK);
  });

  it('returns LOW_STOCK when quantity is at or below minimum', () => {
    expect(
      deriveStockStatus({ trackStock: true, stockQty: 2, minStockQty: 2 }),
    ).toBe(StockStatus.LOW_STOCK);
    expect(
      deriveStockStatus({ trackStock: true, stockQty: 1, minStockQty: 2 }),
    ).toBe(StockStatus.LOW_STOCK);
  });

  it('returns IN_STOCK when quantity is above minimum', () => {
    expect(
      deriveStockStatus({ trackStock: true, stockQty: 5, minStockQty: 2 }),
    ).toBe(StockStatus.IN_STOCK);
  });

  it('ignores minimum when minStockQty is zero', () => {
    expect(
      deriveStockStatus({ trackStock: true, stockQty: 1, minStockQty: 0 }),
    ).toBe(StockStatus.IN_STOCK);
  });
});
