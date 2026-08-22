import type {
  AddPaymentRequest,
  AddPaymentResponse,
  DebtListQuery,
  DebtListResponse,
} from '@furniture-erp/shared';

import * as debtRepository from '../repositories/debt.repository.js';
import * as saleService from './sale.service.js';

export async function listDebts(
  storeId: string,
  query: DebtListQuery,
): Promise<DebtListResponse> {
  return debtRepository.listDebts(storeId, query);
}

/** Collect payment against an open debt sale — same rules as sale payments. */
export async function recordDebtPayment(
  storeId: string,
  actorId: string,
  saleId: string,
  input: AddPaymentRequest,
): Promise<AddPaymentResponse> {
  return saleService.addPayment(storeId, actorId, saleId, input);
}
