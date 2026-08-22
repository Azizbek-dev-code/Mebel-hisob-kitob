import { SalePaymentStatus } from '../constants/enums.js';
import type { Money } from '../types/api.js';
import { subtractMoney, sumMoney, toMoney } from '../utils/money.js';

export interface SaleLineInput {
  quantity: number;
  unitCostPrice: Money;
  unitSalePrice: Money;
}

/**
 * Costs incurred to complete this particular sale.
 *
 * Deliberately separate from the product's cost price: mixing them would make it
 * impossible to answer "what is our margin on bedroom sets?" later, because the
 * answer would silently include a one-off delivery.
 */
export interface SaleCostsInput {
  sellerBonus?: Money;
  installationCost?: Money;
  deliveryCost?: Money;
  otherCosts?: Money;
}

export interface SaleTotalsInput {
  items: SaleLineInput[];
  discountAmount?: Money;
  /** Down payment taken when the sale is created. */
  depositAmount?: Money;
  /** Payments received after the deposit. The deposit is added automatically. */
  additionalPaidAmount?: Money;
  costs?: SaleCostsInput;
}

export interface SaleLineTotals {
  quantity: number;
  unitCostPrice: Money;
  unitSalePrice: Money;
  lineCostTotal: Money;
  lineSaleTotal: Money;
}

export interface SaleTotals {
  lines: SaleLineTotals[];

  subtotal: Money;
  discountAmount: Money;
  totalSalePrice: Money;
  totalCostPrice: Money;

  sellerBonus: Money;
  installationCost: Money;
  deliveryCost: Money;
  otherCosts: Money;
  /** sellerBonus + installationCost + deliveryCost + otherCosts */
  additionalCosts: Money;

  /** totalSalePrice - totalCostPrice. May be negative when goods are sold at a loss. */
  grossProfit: number;
  /** grossProfit - additionalCosts. May be negative. */
  netProfit: number;

  depositAmount: Money;
  paidAmount: Money;
  /** totalSalePrice - paidAmount, floored at zero. */
  remainingAmount: Money;
  paymentStatus: SalePaymentStatus;
}

function lineTotals(item: SaleLineInput): SaleLineTotals {
  const quantity = Math.max(0, Math.trunc(item.quantity));
  const unitCostPrice = toMoney(item.unitCostPrice);
  const unitSalePrice = toMoney(item.unitSalePrice);

  return {
    quantity,
    unitCostPrice,
    unitSalePrice,
    lineCostTotal: toMoney(unitCostPrice * quantity),
    lineSaleTotal: toMoney(unitSalePrice * quantity),
  };
}

/**
 * The single source of truth for a sale's money.
 *
 * The server writes the result to the `sales` row and the sale form renders the
 * same result as a live preview, so the number the cashier reads out loud is by
 * construction the number that gets stored.
 */
export function calculateSaleTotals(input: SaleTotalsInput): SaleTotals {
  const lines = input.items.map(lineTotals);

  const subtotal = sumMoney(...lines.map((line) => line.lineSaleTotal));
  const totalCostPrice = sumMoney(...lines.map((line) => line.lineCostTotal));

  // A discount can never turn into money owed to the customer.
  const discountAmount = Math.min(toMoney(input.discountAmount ?? 0), subtotal);
  const totalSalePrice = subtractMoney(subtotal, discountAmount);

  const sellerBonus = toMoney(input.costs?.sellerBonus ?? 0);
  const installationCost = toMoney(input.costs?.installationCost ?? 0);
  const deliveryCost = toMoney(input.costs?.deliveryCost ?? 0);
  const otherCosts = toMoney(input.costs?.otherCosts ?? 0);
  const additionalCosts = sumMoney(sellerBonus, installationCost, deliveryCost, otherCosts);

  // Profit is a signed figure: clamping it at zero would hide a loss-making sale
  // from the very report that exists to reveal one.
  const grossProfit = toMoney(totalSalePrice - totalCostPrice);
  const netProfit = toMoney(grossProfit - additionalCosts);

  const depositAmount = Math.min(toMoney(input.depositAmount ?? 0), totalSalePrice);
  const paidAmount = Math.min(
    sumMoney(depositAmount, input.additionalPaidAmount ?? 0),
    totalSalePrice,
  );
  const remainingAmount = subtractMoney(totalSalePrice, paidAmount);

  return {
    lines,
    subtotal,
    discountAmount,
    totalSalePrice,
    totalCostPrice,
    sellerBonus,
    installationCost,
    deliveryCost,
    otherCosts,
    additionalCosts,
    grossProfit,
    netProfit,
    depositAmount,
    paidAmount,
    remainingAmount,
    paymentStatus: deriveSalePaymentStatus(totalSalePrice, paidAmount),
  };
}

export function deriveSalePaymentStatus(
  totalSalePrice: Money,
  paidAmount: Money,
): SalePaymentStatus {
  if (totalSalePrice <= 0 || paidAmount >= totalSalePrice) return SalePaymentStatus.PAID;
  if (paidAmount > 0) return SalePaymentStatus.PARTIALLY_PAID;
  return SalePaymentStatus.UNPAID;
}
