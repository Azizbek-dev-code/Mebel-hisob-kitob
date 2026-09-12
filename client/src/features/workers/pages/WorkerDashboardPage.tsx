import { WorkerResponsibility } from '@furniture-erp/shared';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { useMyProfileModules } from '@/features/workers/hooks/use-workers';
import { ROUTES } from '@/routes/paths';
import { formatMoney } from '@/utils/format';

/**
 * Compact "My Work" dashboard for non-admin workers.
 * KPIs come from responsibility-aware /me/profile-modules.
 */
export function WorkerDashboardPage() {
  const { data: user } = useCurrentUser();
  const modulesQuery = useMyProfileModules();
  const modules = modulesQuery.data;
  const finance = modules?.general.finance;
  const responsibilities = user?.responsibilities ?? modules?.worker.responsibilities ?? [];

  const showSales = responsibilities.includes(WorkerResponsibility.SELLER);
  const showAssembly = responsibilities.includes(WorkerResponsibility.ASSEMBLER);
  const showDelivery = responsibilities.includes(WorkerResponsibility.DELIVERY);
  const showInstaller = responsibilities.includes(WorkerResponsibility.INSTALLER);
  const showSmm = responsibilities.includes(WorkerResponsibility.SMM);
  const showOther = responsibilities.includes(WorkerResponsibility.OTHER);

  return (
    <PageContainer className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">
          Xush kelibsiz{user ? `, ${user.fullName.split(' ')[0]}` : ''}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Bugungi ishingiz — {user?.storeName ?? "do'kon"}.
        </p>
      </div>

      {modulesQuery.isError && !modules ? (
        <ErrorState
          title="Ish yig‘indisi yuklanmadi"
          message={
            modulesQuery.error instanceof Error
              ? modulesQuery.error.message
              : 'Qayta urinib ko‘ring.'
          }
          retryLabel="Qayta urinish"
          onRetry={() => void modulesQuery.refetch()}
        />
      ) : null}

      {modulesQuery.isLoading && !modules ? <Skeleton className="h-40 w-full" /> : null}

      {finance ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">Shu oy</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KpiMini label="Ishlab topilgan" value={formatMoney(finance.monthEarned)} emphasize />
            <KpiMini label="To‘langan" value={formatMoney(finance.monthPaid)} />
            <KpiMini label="Avans" value={formatMoney(finance.monthAdvances ?? 0)} />
            <KpiMini
              label="Qolgan"
              value={formatMoney(finance.monthOutstanding ?? finance.outstanding)}
              emphasize
            />
          </div>
        </div>
      ) : null}

      {modules?.seller && showSales ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">Bugun</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <KpiMini label="Sotuvlar" value={String(modules.seller.salesToday)} />
            <KpiMini
              label="Sotuv summasi"
              value={formatMoney(modules.seller.salesAmountToday ?? 0)}
            />
          </div>
          <h3 className="pt-2 text-sm font-semibold text-ink">Sotuvlar — shu oy</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <KpiMini label="Sotuvlar" value={String(modules.seller.salesThisMonth)} />
            <KpiMini
              label="Sotuv summasi"
              value={formatMoney(modules.seller.salesAmountMonth ?? 0)}
            />
            <KpiMini label="Yalpi foyda" value={formatMoney(modules.seller.grossProfitMonth ?? modules.seller.netProfitMonth ?? 0)} />
            <KpiMini label="Hisoblangan" value={formatMoney(modules.seller.earnedMonth ?? 0)} />
            <KpiMini label="To‘langan" value={formatMoney(modules.seller.paidMonth ?? 0)} />
            <KpiMini
              label="Qolgan"
              value={formatMoney(modules.seller.outstandingMonth ?? 0)}
              emphasize
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <KpiMini
              label="Eng katta sotuv"
              value={formatMoney(modules.seller.largestSaleMonth ?? 0)}
            />
            <KpiMini label="O‘rtacha sotuv" value={formatMoney(modules.seller.averageSale ?? 0)} />
          </div>
          {modules.seller.recentSales?.length ? (
            <SectionCard title="Oxirgi sotuvlar">
              <ul className="divide-y divide-line text-sm">
                {modules.seller.recentSales.slice(0, 5).map((sale) => (
                  <li key={sale.id} className="flex items-center justify-between gap-3 py-2">
                    <Link
                      to={ROUTES.saleDetail(sale.id)}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      #{sale.saleNumber}
                    </Link>
                    <span className="tabular-money">{formatMoney(sale.totalSalePrice)}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      {modules?.assembler && showAssembly ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <KpiMini label="Kutilayotgan terlash" value={String(modules.assembler.pending)} />
          <KpiMini label="Jarayonda" value={String(modules.assembler.inProgress)} />
          <KpiMini
            label="Bu oy yakunlangan"
            value={String(modules.assembler.completedThisMonth)}
          />
          <KpiMini label="Usta haqi" value={formatMoney(modules.assembler.feeTotal)} emphasize />
        </div>
      ) : null}

      {modules?.delivery && showDelivery ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <KpiMini label="Rejalashtirilgan" value={String(modules.delivery.scheduled)} />
          <KpiMini label="Jarayonda" value={String(modules.delivery.inProgress)} />
          <KpiMini label="Yakunlangan" value={String(modules.delivery.completed)} />
          <KpiMini label="Shopir haqi" value={formatMoney(modules.delivery.feeTotal)} emphasize />
        </div>
      ) : null}

      {modules?.installer && showInstaller ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <KpiMini label="O‘rnatish reja" value={String(modules.installer.scheduled)} />
          <KpiMini label="Jarayonda" value={String(modules.installer.inProgress)} />
          <KpiMini label="Yakunlangan" value={String(modules.installer.completed)} />
          <KpiMini
            label="O‘rnatuvchi haqi"
            value={formatMoney(modules.installer.feeTotal)}
            emphasize
          />
        </div>
      ) : null}

      {modules?.smm && showSmm ? (
        modules.smm.hasAssignedWork || modules.smm.hasAttributedFee ? (
          <div className="grid gap-2 sm:grid-cols-3">
            <KpiMini label="SMM bu oy" value={formatMoney(modules.smm.monthEarned)} emphasize />
            <KpiMini label="To‘langan" value={formatMoney(modules.smm.paid)} />
            <KpiMini label="Qolgan" value={formatMoney(modules.smm.outstanding)} />
          </div>
        ) : (
          <SectionCard title="SMM">
            <p className="text-sm text-ink-muted">{modules.smm.emptyWorkMessage}</p>
            <p className="mt-1 text-sm text-ink-muted">{modules.smm.emptyFeeMessage}</p>
          </SectionCard>
        )
      ) : null}

      {modules?.other && showOther ? (
        modules.other.hasAssignedWork || modules.other.hasAttributedFee ? (
          <div className="grid gap-2 sm:grid-cols-3">
            <KpiMini label="Bu oy" value={formatMoney(modules.other.monthEarned)} emphasize />
            <KpiMini label="To‘langan" value={formatMoney(modules.other.paid)} />
            <KpiMini label="Qolgan" value={formatMoney(modules.other.outstanding)} />
          </div>
        ) : (
          <SectionCard title="Boshqa">
            <p className="text-sm text-ink-muted">{modules.other.emptyWorkMessage}</p>
            <p className="mt-1 text-sm text-ink-muted">{modules.other.emptyFeeMessage}</p>
          </SectionCard>
        )
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {showAssembly ? (
          <SectionCard title="Ustalik">
            <p className="text-sm text-ink-muted">Sizga biriktirilgan terlash vazifalari.</p>
            <Link
              to={ROUTES.assemblyTasks}
              className="mt-3 inline-flex text-sm font-medium text-brand-700 hover:underline"
            >
              Mening vazifalarim
            </Link>
          </SectionCard>
        ) : null}
        {showDelivery ? (
          <SectionCard title="Yetkazib berish">
            <p className="text-sm text-ink-muted">Sizga biriktirilgan shopir vazifalari.</p>
            <Link
              to={ROUTES.delivery}
              className="mt-3 inline-flex text-sm font-medium text-brand-700 hover:underline"
            >
              Mening yetkazib berishlarim
            </Link>
          </SectionCard>
        ) : null}
        {showSales ? (
          <SectionCard title="Sotuvlar">
            <p className="text-sm text-ink-muted">Siz sotuvchi sifatida yozilgan sotuvlar.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                to={ROUTES.mySales}
                className="inline-flex text-sm font-medium text-brand-700 hover:underline"
              >
                Mening sotuvlarim
              </Link>
              <Link
                to={ROUTES.myReports}
                className="inline-flex text-sm font-medium text-brand-700 hover:underline"
              >
                Hisobot
              </Link>
            </div>
          </SectionCard>
        ) : null}
        <SectionCard title="Profil">
          <p className="text-sm text-ink-muted">Mas’uliyatlar va batafsil ko‘rsatkichlar.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              to={ROUTES.profile}
              className="inline-flex text-sm font-medium text-brand-700 hover:underline"
            >
              Profilni ochish
            </Link>
            <Link
              to={ROUTES.profileFinances}
              className="inline-flex text-sm font-medium text-brand-700 hover:underline"
            >
              Moliyaviy hisob
            </Link>
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}

function KpiMini({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-3 shadow-card">
      <p className="text-xs text-ink-muted">{label}</p>
      <p
        className={
          emphasize
            ? 'tabular-money mt-1 text-lg font-semibold text-brand-800'
            : 'tabular-money mt-1 text-lg font-semibold text-ink'
        }
      >
        {value}
      </p>
    </div>
  );
}
