import { StockStatus } from '@furniture-erp/shared';

/** Derive display status from on-hand quantity and minimum threshold. */
export function deriveStockStatus(options: {
  trackStock: boolean;
  stockQty: number;
  minStockQty: number;
}): StockStatus {
  if (!options.trackStock) return StockStatus.NOT_TRACKED;
  if (options.stockQty <= 0) return StockStatus.OUT_OF_STOCK;
  if (options.minStockQty > 0 && options.stockQty <= options.minStockQty) {
    return StockStatus.LOW_STOCK;
  }
  return StockStatus.IN_STOCK;
}
