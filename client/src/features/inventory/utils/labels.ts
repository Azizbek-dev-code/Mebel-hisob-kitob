import { StockStatus, type StockMovementType } from '@furniture-erp/shared';

export function stockStatusLabel(status: string): string {
  switch (status) {
    case StockStatus.IN_STOCK:
      return 'Mavjud';
    case StockStatus.LOW_STOCK:
      return 'Kam qolgan';
    case StockStatus.OUT_OF_STOCK:
      return 'Mavjud emas';
    case StockStatus.NOT_TRACKED:
      return 'Kuzatilmaydi';
    default:
      return status;
  }
}

export function stockQtyLabel(qty: number): string {
  return `${qty} dona`;
}

export function movementTypeLabel(type: StockMovementType | string): string {
  switch (type) {
    case 'PURCHASE':
      return 'Kirim';
    case 'SALE':
      return 'Sotuv';
    case 'SALE_CANCEL':
      return 'Sotuv bekor';
    case 'MANUAL_IN':
      return 'Qo‘lda kirim';
    case 'MANUAL_OUT':
      return 'Qo‘lda chiqim';
    case 'ADJUSTMENT':
      return 'Tuzatish';
    default:
      return String(type);
  }
}

export function formatMovementDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
