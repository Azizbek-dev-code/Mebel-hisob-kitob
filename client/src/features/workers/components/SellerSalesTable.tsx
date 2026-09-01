import type { SellerSaleOpsItem, WorkerSaleItem } from '@furniture-erp/shared';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import {
  sellerCommissionStatusLabel,
  sellerCommissionStatusTone,
  sellerRuleTypeLabel,
} from '@/features/workers/utils/seller-labels';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatMoney } from '@/utils/format';
import { formatSaleNumber, saleStatusLabel, saleStatusTone } from '@/utils/sales';

export type SellerSaleRow = Pick<
  SellerSaleOpsItem,
  | 'id'
  | 'saleNumber'
  | 'saleDate'
  | 'customerName'
  | 'productSummary'
  | 'totalSalePrice'
  | 'totalCostPrice'
  | 'grossProfit'
  | 'netProfit'
  | 'ruleType'
  | 'rateLabel'
  | 'estimatedCommission'
  | 'earnedCommission'
  | 'commissionStatus'
> &
  Partial<Pick<SellerSaleOpsItem, 'status' | 'totalCostPrice'>> &
  Partial<Pick<WorkerSaleItem, 'paidAmount' | 'remainingAmount' | 'paymentStatus'>>;

export function SellerSalesTable({
  items,
  compact,
}: {
  items: readonly SellerSaleRow[];
  compact?: boolean;
}) {
  return (
    <>
      <ul className="space-y-2 md:hidden">
        {items.map((sale) => (
          <li key={sale.id} className="rounded-panel border border-line bg-surface p-3 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <Link to={ROUTES.saleDetail(sale.id)} className="font-medium text-brand-700 hover:underline">
                {formatSaleNumber(sale.saleNumber)}
              </Link>
              <Badge tone={sellerCommissionStatusTone(sale.commissionStatus)}>
                {sellerCommissionStatusLabel(sale.commissionStatus)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-ink">{sale.customerName || '—'}</p>
            <p className="text-xs text-ink-muted">
              {formatDate(sale.saleDate)}
              {sale.productSummary ? ` · ${sale.productSummary}` : ''}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-ink-muted">Sotuv</dt>
              <dd className="tabular-money text-right">{formatMoney(sale.totalSalePrice ?? 0)}</dd>
              <dt className="text-ink-muted">Yalpi foyda</dt>
              <dd className="tabular-money text-right">
                {formatMoney(sale.grossProfit ?? sale.netProfit ?? 0)}
              </dd>
              <dt className="text-ink-muted">Komissiya</dt>
              <dd className="tabular-money text-right font-medium">
                {formatMoney(sale.earnedCommission || sale.estimatedCommission || 0)}
              </dd>
              <dt className="text-ink-muted">Qoida</dt>
              <dd className="text-right text-xs">
                {sellerRuleTypeLabel(sale.ruleType)}
                {sale.rateLabel ? ` · ${sale.rateLabel}` : ''}
              </dd>
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className={`w-full text-left text-sm ${compact ? 'min-w-[920px]' : 'min-w-[1100px]'}`}>
          <thead className="border-b border-line text-xs text-ink-muted uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Sotuv</th>
              <th className="px-3 py-2 font-medium">Sana</th>
              <th className="px-3 py-2 font-medium">Mijoz</th>
              {compact ? null : <th className="px-3 py-2 font-medium">Mahsulot</th>}
              <th className="px-3 py-2 font-medium">Summa</th>
              {compact ? null : <th className="px-3 py-2 font-medium">Tannarx</th>}
              <th className="px-3 py-2 font-medium">Yalpi foyda</th>
              <th className="px-3 py-2 font-medium">Qoida</th>
              {compact ? null : <th className="px-3 py-2 font-medium">Taxminiy</th>}
              <th className="px-3 py-2 font-medium">Hisoblangan</th>
              <th className="px-3 py-2 font-medium">Komissiya</th>
              <th className="px-3 py-2 font-medium">Holat</th>
            </tr>
          </thead>
          <tbody>
            {items.map((sale) => (
              <tr key={sale.id} className="border-b border-line/70 last:border-0">
                <td className="px-3 py-2.5">
                  <Link
                    to={ROUTES.saleDetail(sale.id)}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {formatSaleNumber(sale.saleNumber)}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">
                  {formatDate(sale.saleDate)}
                </td>
                <td className="px-3 py-2.5">{sale.customerName || '—'}</td>
                {compact ? null : (
                  <td className="max-w-[180px] truncate px-3 py-2.5 text-ink-soft">
                    {sale.productSummary || '—'}
                  </td>
                )}
                <td className="tabular-money px-3 py-2.5">{formatMoney(sale.totalSalePrice ?? 0)}</td>
                {compact ? null : (
                  <td className="tabular-money px-3 py-2.5">{formatMoney(sale.totalCostPrice ?? 0)}</td>
                )}
                <td className="tabular-money px-3 py-2.5">
                  {formatMoney(sale.grossProfit ?? sale.netProfit ?? 0)}
                </td>
                <td className="px-3 py-2.5 text-xs text-ink-soft">
                  {sellerRuleTypeLabel(sale.ruleType)}
                  {sale.rateLabel ? ` · ${sale.rateLabel}` : ''}
                </td>
                {compact ? null : (
                  <td className="tabular-money px-3 py-2.5">
                    {formatMoney(sale.estimatedCommission ?? 0)}
                  </td>
                )}
                <td className="tabular-money px-3 py-2.5 font-medium">
                  {formatMoney(sale.earnedCommission ?? 0)}
                </td>
                <td className="px-3 py-2.5">
                  <Badge tone={sellerCommissionStatusTone(sale.commissionStatus)}>
                    {sellerCommissionStatusLabel(sale.commissionStatus)}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  {sale.status ? (
                    <Badge tone={saleStatusTone(sale.status)}>{saleStatusLabel(sale.status)}</Badge>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
