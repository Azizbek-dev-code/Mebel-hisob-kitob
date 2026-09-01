import {
  UserRole,
  type AddPaymentRequest,
  type AddPaymentResponse,
  type DebtListQuery,
  type DebtListResponse,
} from '@furniture-erp/shared';

import * as debtRepository from '../repositories/debt.repository.js';
import { ApiError } from '../utils/api-error.js';
import * as saleService from './sale.service.js';

const DEBT_PAYMENT_ROLES: ReadonlySet<string> = new Set([
  UserRole.ADMIN,
  UserRole.PLATFORM_ADMIN,
  UserRole.CASHIER,
]);

export function canCollectDebtPayments(role: string): boolean {
  return DEBT_PAYMENT_ROLES.has(role);
}

export function assertCanCollectDebtPayments(role: string): void {
  if (!canCollectDebtPayments(role)) {
    throw ApiError.forbidden('Only cashiers and administrators can collect debt payments');
  }
}

export async function listDebts(
  storeId: string,
  query: DebtListQuery,
): Promise<DebtListResponse> {
  return debtRepository.listDebts(storeId, query);
}

/** Collect payment against an open debt sale — same rules as sale payments. */
export async function recordDebtPayment(
  storeId: string,
  actor: { id: string; role: string },
  saleId: string,
  input: AddPaymentRequest,
): Promise<AddPaymentResponse> {
  assertCanCollectDebtPayments(actor.role);
  return saleService.addPayment(storeId, actor.id, saleId, input);
}
