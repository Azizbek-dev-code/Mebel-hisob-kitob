import type { DashboardRecentSale } from '@furniture-erp/shared';
import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatDateTime, formatMoney } from '@/utils/format';
import { paymentStatusLabel, paymentStatusTone } from '@/utils/sales';

export interface RecentSalesTableProps {
  sales: DashboardRecentSale[];
  periodLabel: string;
  isLoading: boolean;
}

export function RecentSalesTable({ sales, periodLabel, isLoading }: RecentSalesTableProps) {
  return (
    <SectionCard
      title="So‘nggi sotuvlar"
      description={periodLabel}
      padded={false}
      className="min-w-0"
      action={
        <Link
          to={ROUTES.sales}
          className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          View all
        </Link>
      }
    >
      {isLoading ? (
        <div className="space-y-3 p-4" aria-busy="true">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No sales in this period"
          description="Recent sales will list here once the Sales module records them."
          action={
            <Link
              to={ROUTES.sales}
              className="inline-flex items-center rounded-input bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-600"
            >
              Open Sotuvlar
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-ink-muted">
                <th className="px-4 py-2.5 font-medium sm:px-5">Buyurtma sanasi</th>
                <th className="px-4 py-2.5 font-medium sm:px-5">Olib borish</th>
                <th className="px-4 py-2.5 font-medium sm:px-5">Customer</th>
                <th className="px-4 py-2.5 font-medium sm:px-5">Furniture</th>
                <th className="px-4 py-2.5 font-medium sm:px-5">Seller</th>
                <th className="px-4 py-2.5 font-medium text-right sm:px-5">Amount</th>
                <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-surface-muted">
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft sm:px-5">
                    <div>{formatDateTime(sale.saleDate)}</div>
                    <div className="text-xs text-ink-subtle">#{sale.saleNumber}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft sm:px-5">
                    {sale.deliveryDueDate ? formatDate(sale.deliveryDueDate) : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink sm:px-5">{sale.customerName}</td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-ink-soft sm:px-5">
                    {sale.productSummary}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft sm:px-5">
                    {sale.sellerName ?? '—'}
                  </td>
                  <td className="tabular-money whitespace-nowrap px-4 py-3 text-right font-medium text-ink sm:px-5">
                    {formatMoney(sale.totalSalePrice)}
                  </td>
                  <td className="px-4 py-3 sm:px-5">
                    <Badge tone={paymentStatusTone(sale.paymentStatus)}>
                      {paymentStatusLabel(sale.paymentStatus)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
