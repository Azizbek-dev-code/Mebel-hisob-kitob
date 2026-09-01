import type { FulfilmentStatus } from '../constants/enums.js';
import type { IsoDateString, Money } from './api.js';

/** Shopir operational panel — separate from profile summary. */
export type DeliveryOpsSourceFilter = 'ALL' | 'SALE' | 'PURCHASE';
export type DeliveryOpsStatusFilter =
  | 'ALL'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type DeliveryLedgerStatus = 'PENDING' | 'POSTED' | 'REVERSED' | 'NONE';

export interface DeliveryOpsKpis {
  todayTotal: number;
  todayPending: number;
  todayInProgress: number;
  todayCompleted: number;
  todayEarned: Money;
  monthTotal: number;
  monthEarned: Money;
  monthPaid: Money;
  monthOutstanding: Money;
}

export interface SaleDeliveryOpsItem {
  kind: 'SALE';
  id: string;
  saleId: string;
  saleNumber: number;
  customerName: string;
  customerPhone: string | null;
  address: string | null;
  saleDate: IsoDateString;
  deliveryDueDate: IsoDateString | null;
  deliveryDate: IsoDateString | null;
  status: FulfilmentStatus;
  fee: Money;
  ledgerStatus: DeliveryLedgerStatus;
  /** UX hint for SCHEDULED/PENDING with fee. */
  hint: string | null;
  canStart: boolean;
  canComplete: boolean;
}

export interface PurchaseDeliveryOpsItem {
  kind: 'PURCHASE';
  id: string;
  purchaseNumber: number;
  supplierName: string;
  date: IsoDateString;
  /** Purchase has no fulfilment machine — informational only. */
  status: string;
  fee: Money;
  ledgerStatus: DeliveryLedgerStatus;
  /** Shopir cannot start/complete purchase deliveries in v1. */
  canStart: boolean;
  canComplete: boolean;
  hint: string | null;
}

export interface MyDeliveriesResponse {
  kpis: DeliveryOpsKpis;
  saleDeliveries: SaleDeliveryOpsItem[];
  purchaseDeliveries: PurchaseDeliveryOpsItem[];
}

export interface UpdateSaleDeliveryStatusRequest {
  /** IN_TRANSIT = start, COMPLETED = finish. */
  status: 'IN_TRANSIT' | 'COMPLETED';
}

export interface UpdateSaleDeliveryStatusResponse {
  sale: import('./sales.js').SaleDetail;
  ledgerPosted: boolean;
  message: string;
}
