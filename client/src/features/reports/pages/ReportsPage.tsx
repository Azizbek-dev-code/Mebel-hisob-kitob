import { DateRangePreset, PAYMENT_METHOD_LABELS, type ReportsBundle } from '@furniture-erp/shared';
import { BarChart3, Download, FileSpreadsheet } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { FinancialKpiGrid } from '@/features/dashboard/components/FinancialKpiGrid';
import { FinancialPerformanceChart } from '@/features/dashboard/components/FinancialPerformanceChart';
import { ExpenseCategoryChart } from '@/features/dashboard/components/ExpenseCategoryChart';
import { PeriodSelector } from '@/features/dashboard/components/PeriodSelector';
import {
  DEFAULT_PERIOD,
  isPeriodRequestable,
  type DashboardPeriod,
} from '@/features/dashboard/period';
import { useReportsBundle } from '@/features/reports/hooks/use-reports';
import { downloadCsv } from '@/features/reports/utils/csv';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/utils/format';

type ReportTab =
  | 'overview'
  | 'pnl'
  | 'cash'
  | 'sales'
  | 'expenses'
  | 'debts'
  | 'workers'
  | 'products'
  | 'inventory';

const TABS: Array<{ id: ReportTab; label: string }> = [
  { id: 'overview', label: 'Umumiy' },
  { id: 'pnl', label: 'P&L' },
  { id: 'cash', label: 'Pul oqimi' },
  { id: 'sales', label: 'Sotuvlar' },
  { id: 'expenses', label: 'Xarajatlar' },
  { id: 'debts', label: 'Qarzlar' },
  { id: 'workers', label: 'Sotuvchilar' },
  { id: 'products', label: 'Mahsulotlar' },
  { id: 'inventory', label: 'Ombor' },
];

function listErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'Faqat administrator hisobotlarni ko‘ra oladi.';
    if (error.isUnauthorized) return 'Please sign in again.';
    return error.message || 'Try again.';
  }
  return 'Try again.';
}

function MoneyCell({ value }: { value: number }) {
  return <span className="tabular-money whitespace-nowrap">{formatMoney(value)}</span>;
}

function ReportTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-2 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function OverviewTab({ data, isLoading }: { data?: ReportsBundle; isLoading: boolean }) {
  const summary = data?.summary;
  const metrics = summary?.financial.metrics;
  const changes = summary?.financial.previousPeriod?.changes;

  return (
    <div className="space-y-6">
      <FinancialKpiGrid
        revenue={metrics?.revenue}
        costOfGoodsSold={metrics?.costOfGoodsSold}
        grossProfit={metrics?.grossProfit}
        operatingExpenses={metrics?.operatingExpenses}
        netProfit={metrics?.netProfit}
        cashCollected={metrics?.cashCollected}
        remainingReceivables={summary?.extras.debt.totalOutstanding}
        expenseCount={metrics?.expenseCount}
        periodLabel={summary?.period.label ?? '—'}
        changes={changes}
        isLoading={isLoading}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Qo‘shimcha ko‘rsatkichlar">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between gap-3">
              <span className="text-ink-muted">Yozilgan komissiya</span>
              <MoneyCell value={summary?.extras.settledCompensation ?? 0} />
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-ink-muted">Komissiya yozuvlari</span>
              <span>{summary?.extras.settledCompensationCount ?? 0}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-ink-muted">Bekor qilingan sotuvlar</span>
              <span>{summary?.extras.cancelledSalesCount ?? 0}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-ink-muted">Bekor qilingan xarajatlar</span>
              <span>{summary?.extras.cancelledExpenseCount ?? 0}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-ink-muted">Bajarilgan ish haqi (bekor qilingan hujjatlarda)</span>
              <MoneyCell value={summary?.extras.retainedWorkerFeesOnCancelled ?? 0} />
            </li>
            <li className="pt-2 text-xs text-ink-muted">
              Sof foyda = yalpi foyda − ACTIVE xarajatlar. Komissiya (COMMISSION) bu formulaga
              kiritilmaydi.
            </li>
            <li className="text-xs text-ink-muted">
              Sotuv/kirim bekor qilinsa ham bajarilgan usta, o‘rnatuvchi va shopir haqlari ishchi
              hisobida qoladi — bu real xarajat, lekin sof foydadan ikkinchi marta ayirilmaydi.
            </li>
          </ul>
        </SectionCard>

        <SectionCard title="Manbalar">
          <ul className="space-y-1 text-xs text-ink-soft">
            <li>Daromad: {summary?.sources.revenue}</li>
            <li>COGS: {summary?.sources.cogs}</li>
            <li>Xarajat: {summary?.sources.operatingExpenses}</li>
            <li>Komissiya: {summary?.sources.settledCompensation}</li>
          </ul>
        </SectionCard>
      </div>

      <FinancialPerformanceChart
        trend={data?.trend}
        isLoading={isLoading}
        isError={false}
      />
    </div>
  );
}

function PnLTab({ data }: { data?: ReportsBundle }) {
  const lines = data?.profitLoss.lines ?? [];
  return (
    <SectionCard title="Foyda va zarar (P&L)">
      <ReportTable headers={['Qator', 'Summa', 'Daromaddan %', 'Oldingi', 'O‘zgarish']}>
        {lines.map((line) => (
          <tr key={line.key} className="border-b border-line/70">
            <td className="px-2 py-2 font-medium">{line.label}</td>
            <td className="px-2 py-2 text-right">
              <MoneyCell value={line.amount} />
            </td>
            <td className="px-2 py-2 text-right">
              {line.percentOfRevenue === null ? '—' : `${line.percentOfRevenue}%`}
            </td>
            <td className="px-2 py-2 text-right">
              {line.previousAmount === null ? '—' : <MoneyCell value={line.previousAmount} />}
            </td>
            <td className="px-2 py-2 text-right">
              {line.changePercent === null ? '—' : `${line.changePercent}%`}
            </td>
          </tr>
        ))}
      </ReportTable>
      <p className="mt-3 text-xs text-ink-muted">
        Yozilgan komissiya ({formatMoney(data?.profitLoss.settledCompensationNote.amount ?? 0)}) P&L
        sof foydasidan ayirilmaydi — bu Expense emas, ledger COMMISSION.
      </p>
    </SectionCard>
  );
}

function CashTab({ data }: { data?: ReportsBundle }) {
  const cash = data?.cashFlow;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SectionCard title="Kirim">
          <p className="text-lg font-semibold">
            <MoneyCell value={cash?.inflow.total ?? 0} />
          </p>
        </SectionCard>
        <SectionCard title="Chiqim">
          <p className="text-lg font-semibold">
            <MoneyCell value={cash?.outflow.total ?? 0} />
          </p>
        </SectionCard>
        <SectionCard title="Sof oqim">
          <p className="text-lg font-semibold">
            <MoneyCell value={cash?.netCashFlow ?? 0} />
          </p>
        </SectionCard>
      </div>
      <SectionCard title="Chiqim tarkibi">
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between gap-3">
            <span className="text-ink-muted">Operatsion xarajatlar</span>
            <MoneyCell value={cash?.outflow.operatingExpenses ?? 0} />
          </li>
          <li className="flex justify-between gap-3">
            <span className="text-ink-muted">Ishchi to‘lovlari</span>
            <MoneyCell value={cash?.outflow.workerPayments ?? 0} />
          </li>
          <li className="flex justify-between gap-3">
            <span className="text-ink-muted">Yetkazuvchi to‘lovlari</span>
            <MoneyCell value={cash?.outflow.supplierPayments ?? 0} />
          </li>
        </ul>
      </SectionCard>
      <SectionCard title="To‘lov usullari bo‘yicha kirim">
        <ReportTable headers={['Usul', 'Summa']}>
          {(cash?.inflow.byMethod ?? []).map((row) => (
            <tr key={row.method} className="border-b border-line/70">
              <td className="px-2 py-2">{PAYMENT_METHOD_LABELS[row.method] ?? row.method}</td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.amount} />
              </td>
            </tr>
          ))}
        </ReportTable>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-ink-muted">
          {(cash?.notes ?? []).map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

function SalesTab({ data }: { data?: ReportsBundle }) {
  const sales = data?.sales;
  return (
    <div className="space-y-4">
      <SectionCard title="Sotuvlar xulosasi">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="flex justify-between">
            <span className="text-ink-muted">Buyurtmalar</span>
            <span>{sales?.totals.salesCount ?? 0}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-ink-muted">Daromad</span>
            <MoneyCell value={sales?.totals.revenue ?? 0} />
          </li>
          <li className="flex justify-between">
            <span className="text-ink-muted">COGS</span>
            <MoneyCell value={sales?.totals.cogs ?? 0} />
          </li>
          <li className="flex justify-between">
            <span className="text-ink-muted">Yalpi foyda</span>
            <MoneyCell value={sales?.totals.grossProfit ?? 0} />
          </li>
          <li className="flex justify-between">
            <span className="text-ink-muted">Chegirma</span>
            <MoneyCell value={sales?.totals.discounts ?? 0} />
          </li>
          <li className="flex justify-between">
            <span className="text-ink-muted">O‘rtacha buyurtma</span>
            <MoneyCell value={sales?.totals.averageOrderValue ?? 0} />
          </li>
          <li className="flex justify-between">
            <span className="text-ink-muted">Margin</span>
            <span>
              {sales?.totals.grossMarginPercent === null || sales?.totals.grossMarginPercent === undefined
                ? '—'
                : `${sales.totals.grossMarginPercent}%`}
            </span>
          </li>
          <li className="flex justify-between">
            <span className="text-ink-muted">Bekor qilingan</span>
            <span>{sales?.totals.cancelledSalesCount ?? 0}</span>
          </li>
        </ul>
      </SectionCard>

      <SectionCard
        title="Kunlik"
        action={
          <ExportButton
            label="CSV"
            onClick={() =>
              downloadCsv(
                'reports-sales-daily.csv',
                ['Sana', 'Buyurtmalar', 'Daromad', 'COGS', 'Yalpi'],
                (sales?.byDay ?? []).map((row) => [
                  row.date,
                  row.salesCount,
                  row.revenue,
                  row.cogs,
                  row.grossProfit,
                ]),
              )
            }
          />
        }
      >
        <ReportTable headers={['Sana', 'Buyurtmalar', 'Daromad', 'COGS', 'Yalpi']}>
          {(sales?.byDay ?? []).map((row) => (
            <tr key={row.date} className="border-b border-line/70">
              <td className="px-2 py-2">{row.label}</td>
              <td className="px-2 py-2 text-right">{row.salesCount}</td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.revenue} />
              </td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.cogs} />
              </td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.grossProfit} />
              </td>
            </tr>
          ))}
        </ReportTable>
      </SectionCard>
    </div>
  );
}

function ExpensesTab({ data, isLoading }: { data?: ReportsBundle; isLoading: boolean }) {
  const expenses = data?.expenses;
  return (
    <div className="space-y-4">
      <SectionCard title="Xarajatlar">
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between">
            <span className="text-ink-muted">Jami (ACTIVE)</span>
            <MoneyCell value={expenses?.analytics.total ?? 0} />
          </li>
          <li className="flex justify-between">
            <span className="text-ink-muted">Soni</span>
            <span>{expenses?.analytics.count ?? 0}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-ink-muted">Bekor qilingan (alohida)</span>
            <span>
              {expenses?.cancelledExpenseCount ?? 0} ·{' '}
              <MoneyCell value={expenses?.cancelledExpenseAmount ?? 0} />
            </span>
          </li>
        </ul>
      </SectionCard>
      <ExpenseCategoryChart analytics={expenses?.analytics} isLoading={isLoading} />
    </div>
  );
}

function DebtsTab({ data }: { data?: ReportsBundle }) {
  const debts = data?.debts;
  const payables = data?.supplierPayables;
  return (
    <div className="space-y-4">
      <SectionCard title="Debitorlik">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="flex justify-between">
            <span className="text-ink-muted">Jami qarz</span>
            <MoneyCell value={debts?.summary.totalOutstanding ?? 0} />
          </li>
          <li className="flex justify-between">
            <span className="text-ink-muted">Mijozlar</span>
            <span>{debts?.summary.customersInDebt ?? 0}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-ink-muted">Muddati o‘tgan</span>
            <MoneyCell value={debts?.summary.overdueAmount ?? 0} />
          </li>
          <li className="flex justify-between">
            <span className="text-ink-muted">Davr to‘lovlari</span>
            <MoneyCell value={debts?.periodPaymentsCollected ?? 0} />
          </li>
        </ul>
      </SectionCard>
      <SectionCard title="Mijozlar bo‘yicha">
        <ReportTable headers={['Mijoz', 'Telefon', 'Jami', 'To‘langan', 'Qoldiq', 'Muddati']}>
          {(debts?.items ?? []).map((row) => (
            <tr key={row.saleId} className="border-b border-line/70">
              <td className="px-2 py-2">{row.customerName}</td>
              <td className="px-2 py-2">{row.customerPhone}</td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.totalSalePrice} />
              </td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.paidAmount} />
              </td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.remainingAmount} />
              </td>
              <td className="px-2 py-2">
                {row.hasOverdueInstallment ? (
                  <Badge tone="danger">Overdue</Badge>
                ) : (
                  <Badge tone="neutral">Current</Badge>
                )}
              </td>
            </tr>
          ))}
        </ReportTable>
      </SectionCard>

      {payables ? (
        <>
          <SectionCard title="Yetkazuvchi qarzi (kreditorlik)">
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              <li className="flex justify-between">
                <span className="text-ink-muted">Jami supplier qarzi</span>
                <MoneyCell value={payables.summary.totalOutstanding} />
              </li>
              <li className="flex justify-between">
                <span className="text-ink-muted">Qarzimiz bor</span>
                <span>{payables.summary.suppliersInDebt}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ink-muted">Jami kirim</span>
                <MoneyCell value={payables.summary.totalPurchases} />
              </li>
              <li className="flex justify-between">
                <span className="text-ink-muted">To‘langan</span>
                <MoneyCell value={payables.summary.totalPaid} />
              </li>
              <li className="flex justify-between">
                <span className="text-ink-muted">Ochiq kirimlar</span>
                <span>{payables.summary.openPurchaseCount}</span>
              </li>
            </ul>
          </SectionCard>
          <SectionCard title="Yetkazuvchilar bo‘yicha">
            <ReportTable headers={['Yetkazuvchi', 'Jami', 'To‘langan', 'Qoldiq', 'Ochiq']}>
              {payables.items.map((row) => (
                <tr key={row.supplierId} className="border-b border-line/70">
                  <td className="px-2 py-2">{row.supplierName}</td>
                  <td className="px-2 py-2 text-right">
                    <MoneyCell value={row.totalPurchases} />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <MoneyCell value={row.totalPaid} />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <MoneyCell value={row.outstandingDebt} />
                  </td>
                  <td className="px-2 py-2 text-right">{row.openPurchaseCount}</td>
                </tr>
              ))}
            </ReportTable>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}

function WorkersTab({ data }: { data?: ReportsBundle }) {
  const workers = data?.workers;
  return (
    <div className="space-y-4">
      <SectionCard title="Yozilgan komissiya (settled)">
        <p className="text-sm">
          Jami: <MoneyCell value={workers?.compensation.settledTotal ?? 0} /> ·{' '}
          {workers?.compensation.settledCount ?? 0} yozuv
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Hisoblangan (preview) ≠ yozilgan. Bu yerda faqat ledger COMMISSION.
        </p>
      </SectionCard>
      <SectionCard
        title="Sotuvchi natijalari"
        action={
          <ExportButton
            label="CSV"
            onClick={() =>
              downloadCsv(
                'reports-sellers.csv',
                [
                  'Sotuvchi',
                  'Buyurtmalar',
                  'Daromad',
                  'COGS',
                  'Yalpi',
                  'O‘rtacha',
                  'Mijozlar',
                  'Komissiya',
                ],
                (workers?.sellers ?? []).map((row) => [
                  row.sellerName,
                  row.salesCount,
                  row.revenue,
                  row.cogs,
                  row.grossProfit,
                  row.averageOrderValue,
                  row.customerCount,
                  row.settledCompensation,
                ]),
              )
            }
          />
        }
      >
        <ReportTable
          headers={['Sotuvchi', 'Buyurtma', 'Daromad', 'Yalpi', 'O‘rtacha', 'Mijoz', 'Komissiya']}
        >
          {(workers?.sellers ?? []).map((row) => (
            <tr key={row.sellerId ?? row.sellerName} className="border-b border-line/70">
              <td className="px-2 py-2">{row.sellerName}</td>
              <td className="px-2 py-2 text-right">{row.salesCount}</td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.revenue} />
              </td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.grossProfit} />
              </td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.averageOrderValue} />
              </td>
              <td className="px-2 py-2 text-right">{row.customerCount}</td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.settledCompensation} />
              </td>
            </tr>
          ))}
        </ReportTable>
      </SectionCard>
    </div>
  );
}

function ProductsTab({ data }: { data?: ReportsBundle }) {
  const products = data?.products;
  return (
    <div className="space-y-4">
      <SectionCard title={`Top mahsulotlar (${products?.limit ?? 10})`}>
        <ReportTable headers={['Mahsulot', 'Soni', 'Daromad', 'COGS', 'Yalpi']}>
          {(products?.items ?? []).map((row) => (
            <tr key={row.productId ?? row.productName} className="border-b border-line/70">
              <td className="max-w-[14rem] truncate px-2 py-2">{row.productName}</td>
              <td className="px-2 py-2 text-right">{row.quantity}</td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.revenue} />
              </td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.cogs} />
              </td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.grossProfit} />
              </td>
            </tr>
          ))}
        </ReportTable>
      </SectionCard>
      <SectionCard title="Kategoriya">
        <ReportTable headers={['Kategoriya', 'Soni', 'Daromad', 'Yalpi', 'Margin']}>
          {(products?.byCategory ?? []).map((row) => (
            <tr key={row.categoryId ?? row.categoryName} className="border-b border-line/70">
              <td className="px-2 py-2">{row.categoryName}</td>
              <td className="px-2 py-2 text-right">{row.quantity}</td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.revenue} />
              </td>
              <td className="px-2 py-2 text-right">
                <MoneyCell value={row.grossProfit} />
              </td>
              <td className="px-2 py-2 text-right">
                {row.marginPercent === null ? '—' : `${row.marginPercent}%`}
              </td>
            </tr>
          ))}
        </ReportTable>
      </SectionCard>
    </div>
  );
}

function InventoryTab({ data }: { data?: ReportsBundle }) {
  const inventory = data?.inventory;
  return (
    <SectionCard title="Ombor">
      <ul className="grid gap-2 text-sm sm:grid-cols-2">
        <li className="flex justify-between">
          <span className="text-ink-muted">Mahsulotlar</span>
          <span>{inventory?.snapshot.totalProducts ?? 0}</span>
        </li>
        <li className="flex justify-between">
          <span className="text-ink-muted">Jami dona</span>
          <span>{inventory?.snapshot.totalUnits ?? 0}</span>
        </li>
        <li className="flex justify-between">
          <span className="text-ink-muted">Kam qolgan</span>
          <span>{inventory?.snapshot.lowStockCount ?? 0}</span>
        </li>
        <li className="flex justify-between">
          <span className="text-ink-muted">Tugagan</span>
          <span>{inventory?.snapshot.outOfStockCount ?? 0}</span>
        </li>
        <li className="flex justify-between">
          <span className="text-ink-muted">Kirim (davr)</span>
          <span>{inventory?.movements.stockIn ?? 0}</span>
        </li>
        <li className="flex justify-between">
          <span className="text-ink-muted">Chiqim (davr)</span>
          <span>{inventory?.movements.stockOut ?? 0}</span>
        </li>
        <li className="flex justify-between">
          <span className="text-ink-muted">Sotilgan</span>
          <span>{inventory?.movements.soldQuantity ?? 0}</span>
        </li>
        <li className="flex justify-between">
          <span className="text-ink-muted">Bekor qaytarilgan</span>
          <span>{inventory?.movements.cancelledSaleQuantity ?? 0}</span>
        </li>
      </ul>
      <p className="mt-3 text-xs text-ink-muted">
        Stock qiymati (so‘m) hisoblanmaydi — faqat dona va harakatlar.
      </p>
    </SectionCard>
  );
}

function ExportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs font-medium text-ink hover:bg-surface-hover"
    >
      <Download className="size-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

/**
 * Store financial reports — admin only. Read-only; reuses analytics accounting.
 */
export function ReportsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<DashboardPeriod>(DEFAULT_PERIOD);
  const [tab, setTab] = useState<ReportTab>('overview');
  const [productLimit, setProductLimit] = useState(10);

  const reports = useReportsBundle(period, productLimit, isPeriodRequestable(period));
  const data = reports.data;

  const periodLabel = useMemo(() => data?.summary.period.label ?? '—', [data?.summary.period.label]);

  return (
    <PageContainer className="space-y-6">
      <div data-testid="reports-page" className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('reports.title')}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {t('reports.subtitle', { period: periodLabel })}
          </p>
        </div>
        <PeriodSelector period={period} onChange={setPeriod} disabled={reports.isFetching} />
      </div>

      <div
        role="tablist"
        aria-label="Hisobot bo‘limlari"
        className="flex gap-1 overflow-x-auto rounded-input border border-line bg-surface p-1"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              'shrink-0 rounded-[0.4rem] px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm',
              tab === item.id
                ? 'bg-brand-50 text-brand-700'
                : 'text-ink-soft hover:bg-surface-hover hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'products' ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink-muted">Top</span>
          {[5, 10, 20].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setProductLimit(value)}
              className={cn(
                'rounded-input border px-2 py-1 text-xs',
                productLimit === value
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-line text-ink-soft',
              )}
            >
              {value}
            </button>
          ))}
        </div>
      ) : null}

      {reports.isError ? (
        <ErrorState
          title="Hisobotlarni yuklab bo‘lmadi"
          message={listErrorMessage(reports.error)}
          onRetry={() => void reports.refetch()}
        />
      ) : reports.isLoading && !data ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !data ? (
        <EmptyState
          icon={BarChart3}
          title="Hisobot yo‘q"
          description="Davrni tanlang."
        />
      ) : (
        <>
          {tab === 'overview' ? <OverviewTab data={data} isLoading={reports.isFetching} /> : null}
          {tab === 'pnl' ? <PnLTab data={data} /> : null}
          {tab === 'cash' ? <CashTab data={data} /> : null}
          {tab === 'sales' ? <SalesTab data={data} /> : null}
          {tab === 'expenses' ? (
            <ExpensesTab data={data} isLoading={reports.isFetching} />
          ) : null}
          {tab === 'debts' ? <DebtsTab data={data} /> : null}
          {tab === 'workers' ? <WorkersTab data={data} /> : null}
          {tab === 'products' ? <ProductsTab data={data} /> : null}
          {tab === 'inventory' ? <InventoryTab data={data} /> : null}

          <p className="flex items-center gap-2 text-xs text-ink-muted">
            <FileSpreadsheet className="size-3.5" aria-hidden="true" />
            Hisobotlar faqat o‘qish uchun — ochish hech narsani o‘zgartirmaydi. Preset:{' '}
            {period.preset === DateRangePreset.CUSTOM ? 'CUSTOM' : period.preset}
          </p>
        </>
      )}
      </div>
    </PageContainer>
  );
}
