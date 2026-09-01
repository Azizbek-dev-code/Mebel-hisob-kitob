import type {
  WorkerProfileAssemblyTaskItem,
  WorkerProfileDeliveryItem,
  WorkerProfileInstallationItem,
  WorkerProfileModuleTab,
  WorkerProfileModules,
  WorkerProfilePurchaseDeliveryItem,
  WorkerProfileSmmModule,
} from '@furniture-erp/shared';
import { Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatMoney } from '@/utils/format';
import {
  assemblyStatusLabel,
  assemblyStatusTone,
  deliveryStatusLabel,
  deliveryStatusTone,
  formatSaleNumber,
  installationStatusLabel,
} from '@/utils/sales';
import { SellerModuleTab } from '@/features/workers/components/SellerModuleTab';

const TAB_LABELS: Record<WorkerProfileModuleTab, string> = {
  GENERAL: 'Umumiy',
  SELLER: 'Sotuvchilik',
  ASSEMBLER: 'Ustalik',
  DELIVERY: 'Shopirlik',
  INSTALLER: "O'rnatish",
  SMM: 'SMM',
  OTHER: 'Boshqa',
};

const LEDGER_STATUS_LABEL: Record<
  WorkerProfileAssemblyTaskItem['ledgerStatus'],
  string
> = {
  PENDING: 'Kutilmoqda',
  POSTED: 'Hisobga yozilgan',
  REVERSED: 'Qaytarilgan',
  NONE: 'Yo‘q',
};

const LEDGER_STATUS_TONE: Record<
  WorkerProfileAssemblyTaskItem['ledgerStatus'],
  BadgeTone
> = {
  PENDING: 'warning',
  POSTED: 'success',
  REVERSED: 'neutral',
  NONE: 'neutral',
};

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

function CountChip({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-input border border-line bg-surface px-3 py-2">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function ModuleEmpty({ title, description }: { title: string; description: string }) {
  return <EmptyState icon={Wallet} title={title} description={description} />;
}

function GeneralTab({ modules }: { modules: WorkerProfileModules }) {
  const finance = modules.general.finance;
  const breakdown = modules.general.breakdown;

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiChip label="Jami hisoblangan" value={formatMoney(finance.earned)} emphasize />
        <KpiChip label="Jami to‘langan" value={formatMoney(finance.paid)} />
        <KpiChip label="Qolgan" value={formatMoney(finance.outstanding)} emphasize />
        <KpiChip label="Bu oy hisoblangan" value={formatMoney(finance.monthEarned)} />
        <KpiChip label="Bu oy to‘langan" value={formatMoney(finance.monthPaid)} />
        <KpiChip label="Bonus" value={formatMoney(finance.bonuses)} />
        <KpiChip label="Avans" value={formatMoney(finance.advances)} />
        <KpiChip label="Qarz" value={formatMoney(finance.debt)} />
        <KpiChip label="Tuzatish" value={formatMoney(finance.adjustments)} />
        <KpiChip label="Qaytarish" value={formatMoney(finance.reversals)} />
      </div>

      <SectionCard title="Mas’uliyat bo‘yicha" description="Hisobga tushgan summalar va soni">
        {breakdown.length === 0 ? (
          <ModuleEmpty
            title="Hali taqsimot yo‘q"
            description="Mas’uliyat bo‘yicha hisoblangan summalar paydo bo‘lganda shu yerda ko‘rinadi."
          />
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {breakdown.map((row) => (
                <li
                  key={row.responsibility}
                  className="rounded-panel border border-line bg-surface p-3 shadow-card"
                >
                  <p className="font-medium text-ink">{row.label}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {formatMoney(row.earned)} · {row.count} ta
                  </p>
                  {row.detail ? (
                    <p className="mt-1 text-xs text-ink-muted">{row.detail}</p>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-line text-xs text-ink-muted uppercase">
                  <tr>
                    <th className="px-3 py-2 font-medium">Mas’uliyat</th>
                    <th className="px-3 py-2 font-medium">Hisoblangan</th>
                    <th className="px-3 py-2 font-medium">Soni</th>
                    <th className="px-3 py-2 font-medium">Izoh</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((row) => (
                    <tr key={row.responsibility} className="border-b border-line/70 last:border-0">
                      <td className="px-3 py-2.5 font-medium text-ink">{row.label}</td>
                      <td className="tabular-money px-3 py-2.5">{formatMoney(row.earned)}</td>
                      <td className="px-3 py-2.5">{row.count}</td>
                      <td className="px-3 py-2.5 text-ink-soft">{row.detail ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}


function AssemblerTab({ modules }: { modules: WorkerProfileModules }) {
  const assembler = modules.assembler;
  if (!assembler) {
    return (
      <ModuleEmpty
        title="Ustalik ma’lumoti yo‘q"
        description="Terlash vazifalari paydo bo‘lganda shu yerda ko‘rinadi."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <CountChip label="Kutilmoqda" value={assembler.pending} />
        <CountChip label="Jarayonda" value={assembler.inProgress} />
        <CountChip label="Yakunlangan" value={assembler.completed} />
        <CountChip label="Bekor" value={assembler.cancelled} />
        <CountChip label="Bu oy yakunlangan" value={assembler.completedThisMonth} />
        <KpiChip label="Haq jami" value={formatMoney(assembler.feeTotal)} emphasize />
        <KpiChip label="To‘langan" value={formatMoney(assembler.paid)} />
        <KpiChip label="Qolgan" value={formatMoney(assembler.outstanding)} />
      </div>
      <SectionCard title="Vazifalar">
        {assembler.tasks.length === 0 ? (
          <ModuleEmpty
            title="Vazifalar yo‘q"
            description="Hali terlash vazifasi biriktirilmagan."
          />
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {assembler.tasks.map((task) => (
                <AssemblyTaskCard key={task.id} task={task} />
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[880px] w-full text-left text-sm">
                <thead className="border-b border-line text-xs text-ink-muted uppercase">
                  <tr>
                    <th className="px-3 py-2 font-medium">Sotuv</th>
                    <th className="px-3 py-2 font-medium">Mijoz</th>
                    <th className="px-3 py-2 font-medium">Mahsulot</th>
                    <th className="px-3 py-2 font-medium">Holat</th>
                    <th className="px-3 py-2 font-medium">Sanalar</th>
                    <th className="px-3 py-2 font-medium">Haq</th>
                    <th className="px-3 py-2 font-medium">Ledger</th>
                  </tr>
                </thead>
                <tbody>
                  {assembler.tasks.map((task) => (
                    <tr key={task.id} className="border-b border-line/70 last:border-0">
                      <td className="px-3 py-2.5">
                        <Link
                          to={ROUTES.saleDetail(task.saleId)}
                          className="text-brand-700 hover:underline"
                        >
                          {formatSaleNumber(task.saleNumber)}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">{task.customerName}</td>
                      <td className="px-3 py-2.5 text-ink-soft">{task.productSummary}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={assemblyStatusTone(task.status)}>
                          {assemblyStatusLabel(task.status)}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">
                        {formatDate(task.assignedAt)}
                        {task.completedAt ? ` → ${formatDate(task.completedAt)}` : ''}
                      </td>
                      <td className="tabular-money px-3 py-2.5">
                        {formatMoney(task.assemblyFee)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={LEDGER_STATUS_TONE[task.ledgerStatus]}>
                          {LEDGER_STATUS_LABEL[task.ledgerStatus]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

function AssemblyTaskCard({ task }: { task: WorkerProfileAssemblyTaskItem }) {
  return (
    <li className="rounded-panel border border-line bg-surface p-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <Link
          to={ROUTES.saleDetail(task.saleId)}
          className="font-medium text-brand-700 hover:underline"
        >
          {formatSaleNumber(task.saleNumber)}
        </Link>
        <Badge tone={assemblyStatusTone(task.status)}>{assemblyStatusLabel(task.status)}</Badge>
      </div>
      <p className="mt-1 text-sm text-ink">{task.customerName}</p>
      <p className="text-sm text-ink-soft">{task.productSummary}</p>
      <p className="mt-1 text-xs text-ink-muted">
        {formatDate(task.assignedAt)}
        {task.completedAt ? ` → ${formatDate(task.completedAt)}` : ''}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="tabular-money text-sm font-semibold">{formatMoney(task.assemblyFee)}</span>
        <Badge tone={LEDGER_STATUS_TONE[task.ledgerStatus]}>
          {LEDGER_STATUS_LABEL[task.ledgerStatus]}
        </Badge>
      </div>
    </li>
  );
}

function DeliveryTab({ modules }: { modules: WorkerProfileModules }) {
  const delivery = modules.delivery;
  if (!delivery) {
    return (
      <ModuleEmpty
        title="Shopirlik ma’lumoti yo‘q"
        description="Yetkazib berishlar paydo bo‘lganda shu yerda ko‘rinadi."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">
          Shopirlik — qisqa statistika. Ishni boshqarish uchun yetkazib berish paneliga o‘ting.
        </p>
        <Link
          to={ROUTES.delivery}
          className="inline-flex text-sm font-medium text-brand-700 hover:underline"
          data-testid="delivery-ops-link"
        >
          Yetkazib berishlar paneli →
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <CountChip label="Rejalashtirilgan" value={delivery.scheduled} />
        <CountChip label="Jarayonda" value={delivery.inProgress} />
        <CountChip label="Yakunlangan" value={delivery.completed} />
        <CountChip label="Bekor" value={delivery.cancelled} />
        <KpiChip label="Haq jami" value={formatMoney(delivery.feeTotal)} emphasize />
        <KpiChip label="Bu oy haq" value={formatMoney(delivery.feeThisMonth)} />
        <KpiChip label="To‘langan" value={formatMoney(delivery.paid)} />
        <KpiChip label="Qolgan" value={formatMoney(delivery.outstanding)} />
      </div>

      <SectionCard
        title="A) Sotuv yetkazib berishlari"
        description="Faqat sotuvdagi yetkazib berishlar"
      >
        {delivery.saleDeliveries.length === 0 ? (
          <ModuleEmpty
            title="Sotuv yetkazib berishlari yo‘q"
            description="Sizga biriktirilgan sotuv yetkazib berishlari shu yerda ko‘rinadi."
          />
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {delivery.saleDeliveries.map((item) => (
                <SaleDeliveryCard key={item.id} item={item} />
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead className="border-b border-line text-xs text-ink-muted uppercase">
                  <tr>
                    <th className="px-3 py-2 font-medium">Sotuv</th>
                    <th className="px-3 py-2 font-medium">Mijoz</th>
                    <th className="px-3 py-2 font-medium">Manzil</th>
                    <th className="px-3 py-2 font-medium">Sana</th>
                    <th className="px-3 py-2 font-medium">Holat</th>
                    <th className="px-3 py-2 font-medium">Haq</th>
                    <th className="px-3 py-2 font-medium">Ledger</th>
                  </tr>
                </thead>
                <tbody>
                  {delivery.saleDeliveries.map((item) => (
                    <tr key={item.id} className="border-b border-line/70 last:border-0">
                      <td className="px-3 py-2.5">
                        <Link
                          to={ROUTES.saleDetail(item.saleId)}
                          className="text-brand-700 hover:underline"
                        >
                          {formatSaleNumber(item.saleNumber)}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">{item.customerName}</td>
                      <td className="max-w-xs truncate px-3 py-2.5 text-ink-soft">
                        {item.address ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">
                        {item.deliveryDate ? formatDate(item.deliveryDate) : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={deliveryStatusTone(item.status)}>
                          {deliveryStatusLabel(item.status)}
                        </Badge>
                        {item.hint ? (
                          <p className="mt-1 text-xs text-ink-muted">{item.hint}</p>
                        ) : null}
                      </td>
                      <td className="tabular-money px-3 py-2.5">{formatMoney(item.fee)}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={LEDGER_STATUS_TONE[item.ledgerStatus]}>
                          {LEDGER_STATUS_LABEL[item.ledgerStatus]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard
        title="B) Kirim (purchase) yetkazib berishlari"
        description="Faqat kirimdan shopir haqlari — sotuvlar bilan aralashtirilmaydi"
      >
        {delivery.purchaseDeliveries.length === 0 ? (
          <ModuleEmpty
            title="Kirim yetkazib berishlari yo‘q"
            description="Kirimdan shopir haqlari shu yerda alohida ko‘rinadi."
          />
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {delivery.purchaseDeliveries.map((item) => (
                <PurchaseDeliveryCard key={item.id} item={item} />
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[720px] w-full text-left text-sm">
                <thead className="border-b border-line text-xs text-ink-muted uppercase">
                  <tr>
                    <th className="px-3 py-2 font-medium">Kirim</th>
                    <th className="px-3 py-2 font-medium">Yetkazib beruvchi</th>
                    <th className="px-3 py-2 font-medium">Sana</th>
                    <th className="px-3 py-2 font-medium">Holat</th>
                    <th className="px-3 py-2 font-medium">Haq</th>
                    <th className="px-3 py-2 font-medium">Ledger</th>
                  </tr>
                </thead>
                <tbody>
                  {delivery.purchaseDeliveries.map((item) => (
                    <tr key={item.id} className="border-b border-line/70 last:border-0">
                      <td className="px-3 py-2.5">#{item.purchaseNumber}</td>
                      <td className="px-3 py-2.5">{item.supplierName}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-3 py-2.5">{item.status}</td>
                      <td className="tabular-money px-3 py-2.5">
                        {formatMoney(item.driverFee)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={LEDGER_STATUS_TONE[item.ledgerStatus]}>
                          {LEDGER_STATUS_LABEL[item.ledgerStatus]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

function SaleDeliveryCard({ item }: { item: WorkerProfileDeliveryItem }) {
  return (
    <li className="rounded-panel border border-line bg-surface p-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <Link
          to={ROUTES.saleDetail(item.saleId)}
          className="font-medium text-brand-700 hover:underline"
        >
          {formatSaleNumber(item.saleNumber)}
        </Link>
        <Badge tone={deliveryStatusTone(item.status)}>{deliveryStatusLabel(item.status)}</Badge>
      </div>
      <p className="mt-1 text-sm text-ink">{item.customerName}</p>
      <p className="text-sm text-ink-soft">{item.address ?? '—'}</p>
      <p className="mt-1 text-xs text-ink-muted">
        {item.deliveryDate ? formatDate(item.deliveryDate) : 'Sana belgilanmagan'}
      </p>
      {item.hint ? <p className="mt-1 text-xs text-warning-700">{item.hint}</p> : null}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="tabular-money text-sm font-semibold">{formatMoney(item.fee)}</span>
        <Badge tone={LEDGER_STATUS_TONE[item.ledgerStatus]}>
          {LEDGER_STATUS_LABEL[item.ledgerStatus]}
        </Badge>
      </div>
    </li>
  );
}

function PurchaseDeliveryCard({ item }: { item: WorkerProfilePurchaseDeliveryItem }) {
  return (
    <li className="rounded-panel border border-line bg-surface p-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-ink">Kirim #{item.purchaseNumber}</p>
        <Badge tone={LEDGER_STATUS_TONE[item.ledgerStatus]}>
          {LEDGER_STATUS_LABEL[item.ledgerStatus]}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{item.supplierName}</p>
      <p className="text-xs text-ink-muted">
        {formatDate(item.date)} · {item.status}
      </p>
      <p className="tabular-money mt-2 text-sm font-semibold">{formatMoney(item.driverFee)}</p>
    </li>
  );
}

function InstallerTab({ modules }: { modules: WorkerProfileModules }) {
  const installer = modules.installer;
  if (!installer) {
    return (
      <ModuleEmpty
        title="O‘rnatish ma’lumoti yo‘q"
        description="O‘rnatish vazifalari paydo bo‘lganda shu yerda ko‘rinadi."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <CountChip label="Rejalashtirilgan" value={installer.scheduled} />
        <CountChip label="Jarayonda" value={installer.inProgress} />
        <CountChip label="Yakunlangan" value={installer.completed} />
        <CountChip label="Bekor" value={installer.cancelled} />
        <KpiChip label="Haq jami" value={formatMoney(installer.feeTotal)} emphasize />
        <KpiChip label="To‘langan" value={formatMoney(installer.paid)} />
        <KpiChip label="Qolgan" value={formatMoney(installer.outstanding)} />
      </div>
      <SectionCard title="O‘rnatishlar">
        {installer.installations.length === 0 ? (
          <ModuleEmpty
            title="O‘rnatishlar yo‘q"
            description="Sizga biriktirilgan o‘rnatishlar shu yerda ko‘rinadi."
          />
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {installer.installations.map((item) => (
                <InstallationCard key={item.saleId} item={item} />
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[800px] w-full text-left text-sm">
                <thead className="border-b border-line text-xs text-ink-muted uppercase">
                  <tr>
                    <th className="px-3 py-2 font-medium">Sotuv</th>
                    <th className="px-3 py-2 font-medium">Mijoz</th>
                    <th className="px-3 py-2 font-medium">Holat</th>
                    <th className="px-3 py-2 font-medium">Yakunlangan</th>
                    <th className="px-3 py-2 font-medium">Haq</th>
                    <th className="px-3 py-2 font-medium">Ledger</th>
                  </tr>
                </thead>
                <tbody>
                  {installer.installations.map((item) => (
                    <tr key={item.saleId} className="border-b border-line/70 last:border-0">
                      <td className="px-3 py-2.5">
                        <Link
                          to={ROUTES.saleDetail(item.saleId)}
                          className="text-brand-700 hover:underline"
                        >
                          {formatSaleNumber(item.saleNumber)}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">{item.customerName}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={deliveryStatusTone(item.status)}>
                          {installationStatusLabel(item.status)}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">
                        {item.completedAt ? formatDate(item.completedAt) : '—'}
                      </td>
                      <td className="tabular-money px-3 py-2.5">{formatMoney(item.fee)}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={LEDGER_STATUS_TONE[item.ledgerStatus]}>
                          {LEDGER_STATUS_LABEL[item.ledgerStatus]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

function InstallationCard({ item }: { item: WorkerProfileInstallationItem }) {
  return (
    <li className="rounded-panel border border-line bg-surface p-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <Link
          to={ROUTES.saleDetail(item.saleId)}
          className="font-medium text-brand-700 hover:underline"
        >
          {formatSaleNumber(item.saleNumber)}
        </Link>
        <Badge tone={deliveryStatusTone(item.status)}>
          {installationStatusLabel(item.status)}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-ink">{item.customerName}</p>
      <p className="mt-1 text-xs text-ink-muted">
        {item.completedAt ? `Yakunlangan: ${formatDate(item.completedAt)}` : 'Hali yakunlanmagan'}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="tabular-money text-sm font-semibold">{formatMoney(item.fee)}</span>
        <Badge tone={LEDGER_STATUS_TONE[item.ledgerStatus]}>
          {LEDGER_STATUS_LABEL[item.ledgerStatus]}
        </Badge>
      </div>
    </li>
  );
}

function SmmOrOtherTab({
  module,
  emptyTitle,
}: {
  module: WorkerProfileSmmModule | null;
  emptyTitle: string;
}) {
  if (!module) {
    return (
      <ModuleEmpty
        title={emptyTitle}
        description="Bu oy uchun moliyaviy yozuvlar paydo bo‘lganda shu yerda ko‘rinadi."
      />
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <KpiChip label="Bu oy hisoblangan" value={formatMoney(module.monthEarned)} emphasize />
      <KpiChip label="To‘langan" value={formatMoney(module.paid)} />
      <KpiChip label="Qolgan" value={formatMoney(module.outstanding)} emphasize />
      <KpiChip label="Bonus" value={formatMoney(module.bonuses)} />
      <KpiChip label="Avans" value={formatMoney(module.advances)} />
      <KpiChip label="Qarz" value={formatMoney(module.debt)} />
      <KpiChip label="To‘lov" value={formatMoney(module.payments)} />
      <KpiChip label="Tuzatish" value={formatMoney(module.adjustments)} />
    </div>
  );
}

export function WorkerProfileModulesPanel({
  modules,
  isLoading,
  isError,
  onRetry,
}: {
  modules: WorkerProfileModules | undefined;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const availableTabs = modules?.tabs ?? (['GENERAL'] as WorkerProfileModuleTab[]);
  const [activeTab, setActiveTab] = useState<WorkerProfileModuleTab>('GENERAL');

  const resolvedTab = useMemo(() => {
    if (availableTabs.includes(activeTab)) return activeTab;
    return availableTabs[0] ?? 'GENERAL';
  }, [activeTab, availableTabs]);

  if (isLoading && !modules) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError && !modules) {
    return (
      <ErrorState
        title="Profil modullari yuklanmadi"
        message="Mas’uliyat bo‘yicha ma’lumotlarni yuklab bo‘lmadi."
        retryLabel="Qayta urinish"
        onRetry={onRetry}
      />
    );
  }

  if (!modules) {
    return (
      <ModuleEmpty
        title="Profil moduli yo‘q"
        description="Ishchi profili hali tayyor emas."
      />
    );
  }

  return (
    <div className="space-y-4" data-testid="worker-profile-modules">
      <nav
        aria-label="Profil modullari"
        className="-mx-1 max-w-full overflow-x-auto overflow-y-hidden"
      >
        <div className="flex w-max min-w-full gap-1 rounded-input border border-line bg-surface-muted p-1">
          {availableTabs.map((tab) => {
            const active = resolvedTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'shrink-0 rounded-[0.4rem] px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-surface text-brand-700 shadow-card'
                    : 'text-ink-soft hover:bg-surface-hover hover:text-ink',
                )}
              >
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>
      </nav>

      {resolvedTab === 'GENERAL' ? <GeneralTab modules={modules} /> : null}
      {resolvedTab === 'SELLER' ? <SellerModuleTab modules={modules} /> : null}
      {resolvedTab === 'ASSEMBLER' ? <AssemblerTab modules={modules} /> : null}
      {resolvedTab === 'DELIVERY' ? <DeliveryTab modules={modules} /> : null}
      {resolvedTab === 'INSTALLER' ? <InstallerTab modules={modules} /> : null}
      {resolvedTab === 'SMM' ? (
        <SmmOrOtherTab module={modules.smm} emptyTitle="SMM ma’lumoti yo‘q" />
      ) : null}
      {resolvedTab === 'OTHER' ? (
        <SmmOrOtherTab module={modules.other} emptyTitle="Boshqa ma’lumot yo‘q" />
      ) : null}
    </div>
  );
}
