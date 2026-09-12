import type {
  WorkerAttributedFeeItem,
  WorkerAttributedFeeKind,
  WorkerAttributedFeesSummary,
} from '@furniture-erp/shared';
import { Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatMoney } from '@/utils/format';

const KIND_LABEL: Record<WorkerAttributedFeeKind, string> = {
  SELLER_COMMISSION: 'Sotuvchi komissiyasi',
  SELLER_BONUS: 'Sotuvchi bonusi',
  ASSEMBLER_FEE: 'Usta haqqi',
  INSTALLER_FEE: 'O‘rnatuvchi haqqi',
  DELIVERY_FEE: 'Yetkazib berish / shopir haqqi',
  PURCHASE_DRIVER_FEE: 'Kirimdan shopir haqqi',
  MANUAL_COMMISSION: "Qo'lda komissiya / haq",
};

function referenceHref(item: WorkerAttributedFeeItem): string | null {
  if (item.source === 'SALE') return ROUTES.saleDetail(item.referenceId);
  if (item.source === 'PURCHASE') return ROUTES.purchaseDetail(item.referenceId);
  return null;
}

function sourceLabel(source: WorkerAttributedFeeItem['source']): string {
  if (source === 'PURCHASE') return 'Kirim';
  if (source === 'MANUAL') return "Qo'lda";
  return 'Sotuv';
}

export function WorkerAttributedFeesPanel({
  fees,
  isLoading,
  isError,
  onRetry,
  linkReferences = true,
}: {
  fees: WorkerAttributedFeesSummary | undefined;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** Admin pages can deep-link to sale/purchase; self profile may hide links. */
  linkReferences?: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (isError) {
    return (
      <SectionCard title="Hisobga tushgan haqlar">
        <p className="text-sm text-danger-700">Haqlar yuklanmadi.</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-sm text-brand-700 hover:underline"
          >
            Qayta urinish
          </button>
        ) : null}
      </SectionCard>
    );
  }

  if (!fees || fees.items.length === 0) {
    return (
      <SectionCard
        title="Hisobga tushgan haqlar"
        description="Faqat hisobga yozilgan (settled / completed) summalar"
      >
        <EmptyState
          icon={Wallet}
          title="Hali haq yo‘q"
          description="Komissiya settle, usta/shopir ishi yakunlanganda yoki admin qo‘lda qo‘shganda shu yerda ko‘rinadi."
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Hisobga tushgan haqlar"
      description="Manba bo‘yicha — ledger’dagi haqiqiy COMMISSION yozuvlari"
      data-testid="worker-attributed-fees"
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        <SummaryChip label="Sotuvchi komissiyasi" amount={fees.sellerBonusTotal} />
        <SummaryChip label="Usta haqlari" amount={fees.assemblerFeeTotal} />
        <SummaryChip label="O‘rnatuvchi haqlari" amount={fees.installerFeeTotal} />
        <SummaryChip label="Yetkazib berish" amount={fees.deliveryFeeTotal} />
        <SummaryChip label="Kirim shopir" amount={fees.purchaseDriverFeeTotal} />
        <SummaryChip label="Qo‘lda" amount={fees.manualFeeTotal} />
        <SummaryChip label="Jami" amount={fees.grandTotal} emphasize />
      </div>

      <ul className="space-y-2 md:hidden">
        {fees.items.map((item) => {
          const href = linkReferences ? referenceHref(item) : null;
          return (
            <li key={item.id} className="rounded-panel border border-line bg-surface p-3 shadow-card">
              <p className="text-sm font-medium text-ink">{KIND_LABEL[item.kind]}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {formatDate(item.occurredAt)} · {sourceLabel(item.source)}
              </p>
              <p className="mt-1 text-sm">
                {href ? (
                  <Link to={href} className="text-brand-700 hover:underline">
                    {item.referenceLabel}
                  </Link>
                ) : (
                  item.referenceLabel
                )}
              </p>
              {item.description ? (
                <p className="mt-1 text-xs text-ink-soft">{item.description}</p>
              ) : null}
              <p className="tabular-money mt-2 text-sm font-semibold">+{formatMoney(item.amount)}</p>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-ink-muted">
            <tr>
              <th className="px-2 py-2 font-medium">Sana</th>
              <th className="px-2 py-2 font-medium">Tur</th>
              <th className="px-2 py-2 font-medium">Manba</th>
              <th className="px-2 py-2 font-medium">Hujjat</th>
              <th className="px-2 py-2 font-medium">Izoh</th>
              <th className="px-2 py-2 font-medium text-right">Summa</th>
            </tr>
          </thead>
          <tbody>
            {fees.items.map((item) => {
              const href = linkReferences ? referenceHref(item) : null;
              return (
                <tr key={item.id} className="border-b border-line last:border-0">
                  <td className="px-2 py-2 whitespace-nowrap">{formatDate(item.occurredAt)}</td>
                  <td className="px-2 py-2">{KIND_LABEL[item.kind]}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{sourceLabel(item.source)}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {href ? (
                      <Link to={href} className="text-brand-700 hover:underline">
                        {item.referenceLabel}
                      </Link>
                    ) : (
                      item.referenceLabel
                    )}
                    {item.sourceCancelled ? (
                      <span className="ml-2 rounded-full bg-danger-50 px-2 py-0.5 text-[11px] text-danger-700">
                        Bekor qilingan
                      </span>
                    ) : null}
                    {item.sourceCancelled && item.workCompleted ? (
                      <span className="ml-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] text-success-700">
                        Ish bajarilgan
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-ink-soft">{item.description ?? '—'}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-right font-medium">
                    +{formatMoney(item.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function SummaryChip({
  label,
  amount,
  emphasize,
}: {
  label: string;
  amount: number;
  emphasize?: boolean;
}) {
  return (
    <div
      className={
        emphasize
          ? 'rounded-input border border-brand-200 bg-brand-50 px-3 py-2'
          : 'rounded-input border border-line bg-surface-muted px-3 py-2'
      }
    >
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${emphasize ? 'text-brand-800' : 'text-ink'}`}>
        {formatMoney(amount)}
      </p>
    </div>
  );
}
