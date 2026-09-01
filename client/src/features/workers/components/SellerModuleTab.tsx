import {
  SellerCommissionStatus,
  type SellerCommissionStatus as SellerCommissionStatusValue,
  type WorkerProfileModules,
} from '@furniture-erp/shared';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { SellerSalesTable } from '@/features/workers/components/SellerSalesTable';
import { sellerRuleTypeLabel } from '@/features/workers/utils/seller-labels';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatMoney } from '@/utils/format';
import { formatSaleNumber } from '@/utils/sales';
import { Wallet } from 'lucide-react';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

function KpiChip({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-input border border-line px-3 py-2',
        emphasize ? 'bg-brand-50/60' : 'bg-surface',
      )}
    >
      <p className="text-xs text-ink-muted">{label}</p>
      <p
        className={cn(
          'tabular-money mt-0.5 text-sm font-semibold',
          emphasize ? 'text-brand-800' : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}

const STATUS_FILTERS: { value: 'ALL' | SellerCommissionStatusValue; label: string }[] = [
  { value: 'ALL', label: 'Barchasi' },
  { value: SellerCommissionStatus.EARNED, label: 'Hisoblangan' },
  { value: SellerCommissionStatus.PARTIALLY_PAID, label: 'Qisman to‘langan' },
  { value: SellerCommissionStatus.PAID, label: 'To‘langan' },
  { value: SellerCommissionStatus.REVERSED, label: 'Qaytarilgan' },
  { value: SellerCommissionStatus.CANCELLED, label: 'Bekor qilingan' },
];

export function SellerModuleTab({ modules }: { modules: WorkerProfileModules }) {
  const { data: user } = useCurrentUser();
  const seller = modules.seller;
  const isSelf = user?.id === modules.worker.id;
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]['value']>('ALL');

  const filteredSales = useMemo(() => {
    if (!seller) return [];
    return (seller.recentSales ?? []).filter((sale) => {
      const day = sale.saleDate.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (status !== 'ALL' && sale.commissionStatus !== status) return false;
      return true;
    });
  }, [seller, from, to, status]);

  if (!seller) {
    return (
      <EmptyState
        icon={Wallet}
        title="Sotuvchilik ma’lumoti yo‘q"
        description="Bu ishchida sotuvchi mas’uliyati yo‘q yoki hali sotuvlar yo‘q."
      />
    );
  }

  const rule = seller.activeRules?.[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <KpiChip label="Bugungi sotuvlar" value={String(seller.salesToday)} />
        <KpiChip label="Shu oy sotuvlari" value={String(seller.salesThisMonth)} />
        <KpiChip
          label="Shu oy sotuv summasi"
          value={formatMoney(seller.salesAmountMonth ?? 0)}
        />
        <KpiChip label="Shu oy yalpi foyda" value={formatMoney(seller.grossProfitMonth ?? seller.netProfitMonth ?? 0)} />
        <KpiChip
          label="Shu oy hisoblangan"
          value={formatMoney(seller.earnedMonth ?? 0)}
          emphasize
        />
        <KpiChip label="Shu oy to‘langan" value={formatMoney(seller.paidMonth ?? 0)} />
        <KpiChip
          label="Shu oy qolgan"
          value={formatMoney(seller.outstandingMonth ?? 0)}
          emphasize
        />
        <KpiChip label="Jami commission" value={formatMoney(seller.earnedTotal ?? 0)} />
        <KpiChip label="Jami to‘langan" value={formatMoney(seller.paidTotal ?? 0)} />
        <KpiChip label="Jami qolgan" value={formatMoney(seller.outstandingTotal ?? 0)} emphasize />
      </div>

      {seller.bonusTotal ? (
        <p className="text-sm text-ink-soft">
          Bonus alohida: {formatMoney(seller.bonusTotal)} (commissionga qo‘shilmagan).
        </p>
      ) : null}

      <SectionCard title="Commission qoidasi">
        {rule ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium text-ink">{sellerRuleTypeLabel(rule.type)}</p>
            <p className="text-ink-soft">
              {rule.rateLabel}
              {rule.type === 'PERCENT_OF_GROSS_PROFIT'
                ? ' · Yalpi foydadan hisoblanadi (sotuv − tannarx). Usta/shopir haqqi bazani kamaytirmaydi. Manfiy foydada commission 0.'
                : ''}
            </p>
            <p className="text-xs text-ink-muted">
              {formatDate(rule.effectiveFrom)}
              {rule.effectiveTo ? ` — ${formatDate(rule.effectiveTo)}` : ' — hozirgacha'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Hali faol commission qoidasi yo‘q.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Sotuvlar"
        description="Faqat shu sotuvchiga biriktirilgan savdolar"
      >
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <input
            type="date"
            className={fieldClass}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            aria-label="Boshlanish sanasi"
          />
          <input
            type="date"
            className={fieldClass}
            value={to}
            onChange={(event) => setTo(event.target.value)}
            aria-label="Tugash sanasi"
          />
          <select
            className={fieldClass}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as (typeof STATUS_FILTERS)[number]['value'])
            }
            aria-label="Komissiya holati"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {filteredSales.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Sotuv yo‘q"
            description="Tanlangan filtr bo‘yicha sotuv topilmadi."
          />
        ) : (
          <SellerSalesTable items={filteredSales} compact />
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {isSelf ? (
            <>
              <Link to={ROUTES.mySales} className="font-medium text-brand-700 hover:underline">
                Barcha sotuvlar
              </Link>
              <Link to={ROUTES.myReports} className="font-medium text-brand-700 hover:underline">
                Hisobot
              </Link>
            </>
          ) : (
            <Link
              to={ROUTES.workerFinances(modules.worker.id)}
              className="font-medium text-brand-700 hover:underline"
            >
              Moliyaviy hisob
            </Link>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Commission yozuvlari">
        {(seller.commissions ?? []).length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Commission yo‘q"
            description="Sotuv yaratilganda qoida asosida hisoblangan komissiya shu yerda chiqadi."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-ink-muted uppercase">
                <tr>
                  <th className="px-3 py-2 font-medium">Sotuv</th>
                  <th className="px-3 py-2 font-medium">Asos</th>
                  <th className="px-3 py-2 font-medium">Stavka</th>
                  <th className="px-3 py-2 font-medium">Summa</th>
                  <th className="px-3 py-2 font-medium">Holat</th>
                </tr>
              </thead>
              <tbody>
                {(seller.commissions ?? []).map((line) => (
                  <tr key={line.id} className="border-b border-line/70 last:border-0">
                    <td className="px-3 py-2.5">
                      {line.saleId ? (
                        <Link
                          to={ROUTES.saleDetail(line.saleId)}
                          className="text-brand-700 hover:underline"
                        >
                          {line.saleNumber ? formatSaleNumber(line.saleNumber) : 'Sotuv'}
                        </Link>
                      ) : (
                        line.description ?? '—'
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft">{line.baseLabel ?? '—'}</td>
                    <td className="px-3 py-2.5">{line.rateLabel ?? '—'}</td>
                    <td className="tabular-money px-3 py-2.5 font-medium">
                      {formatMoney(line.amount)}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={line.status === 'REVERSED' ? 'warning' : 'success'}>
                        {line.status === 'REVERSED' ? 'Qaytarilgan' : 'Hisoblangan'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="To‘lovlar" description="Admin tomonidan yozilgan PAYMENT">
        {(seller.payments ?? []).length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="To‘lov yo‘q"
            description="Hali hech qanday to‘lov yozilmagan. Qolgan summa to‘liq hisoblangan commission."
          />
        ) : (
          <ul className="divide-y divide-line">
            {(seller.payments ?? []).map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-ink">
                    {payment.type === 'PAYMENT' ? 'To‘lov' : 'Qaytarish'}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {formatDate(payment.transactionDate)}
                    {payment.description ? ` · ${payment.description}` : ''}
                  </p>
                </div>
                <p className="tabular-money font-semibold">{formatMoney(payment.amount)}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm">
          Qolgan:{' '}
          <span className="tabular-money font-semibold">{formatMoney(seller.outstandingTotal ?? 0)}</span>
        </p>
      </SectionCard>
    </div>
  );
}
