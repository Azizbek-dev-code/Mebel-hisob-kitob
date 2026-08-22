import {
  STORE_ACCESS_STATUS_LABELS,
  StoreAccessStatus,
  formatMoney,
  formatStoreCreationDate,
  type SubscriptionPlanDto,
} from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { platformBillingService } from '@/services/platform-billing.service';
import { formatDate } from '@/utils/format';

import { RecordPaymentDialog } from '../components/RecordPaymentDialog';
import { usePlatformPlans, usePlatformShop } from '../hooks/use-platform-billing';

export function PlatformShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const detail = usePlatformShop(id);
  const plans = usePlatformPlans();
  const [planOpen, setPlanOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const shop = detail.data?.shop;
  const sub = detail.data?.subscription;
  const invoice = detail.data?.latestInvoice;

  async function changePlan(planId: string) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await platformBillingService.assignPlan(id, { planId });
      await detail.refetch();
      setPlanOpen(false);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : 'Tarifni o‘zgartirib bo‘lmadi');
    } finally {
      setBusy(false);
    }
  }

  async function toggleManualBlock() {
    if (!id || !shop) return;
    const blocked = shop.accessStatus !== StoreAccessStatus.MANUALLY_BLOCKED;
    const ok = window.confirm(
      blocked
        ? 'Do‘kon qo‘lda bloklansinmi? To‘lov qilinishi avtomatik ochmaydi.'
        : 'Qo‘lda blokni olib tashlaysizmi?',
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await platformBillingService.setManualBlock(id, blocked);
      await detail.refetch();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : 'Blok holatini o‘zgartirib bo‘lmadi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <Link to={ROUTES.platformShops} className="text-xs font-medium text-brand-700 hover:underline">
          ← Do'konlar
        </Link>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-ink">
          {shop?.name ?? "Do'kon"}
        </h2>
      </div>

      {detail.isPending && !detail.data ? (
        <Skeleton className="h-40 w-full" />
      ) : detail.isError || !shop ? (
        <ErrorState
          title="Do'konni yuklab bo'lmadi"
          message="Qayta urinib ko'ring."
          onRetry={() => void detail.refetch()}
        />
      ) : (
        <>
          <SectionCard title="Obuna">
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Row label="Tarif" value={sub?.planName ?? '—'} />
              <Row
                label="Oylik to'lov"
                value={sub ? formatMoney(sub.monthlyPrice) : '—'}
              />
              <Row
                label="Keyingi to'lov"
                value={sub ? formatDate(sub.nextPaymentDue) : '—'}
              />
              <Row label="Obuna statusi" value={sub?.status ?? '—'} />
              <Row
                label="Sinov"
                value={
                  sub?.trialEndsAt
                    ? `${formatDate(sub.trialStartedAt ?? sub.startedAt)} – ${formatDate(sub.trialEndsAt)}`
                    : '—'
                }
              />
              <Row
                label="Davr tugashi"
                value={sub ? formatDate(sub.currentPeriodEnd) : '—'}
              />
              <Row
                label="Kirish"
                value={STORE_ACCESS_STATUS_LABELS[shop.accessStatus]}
              />
              {sub?.pendingPlanName ? (
                <Row label="Keyingi davr tarifi" value={sub.pendingPlanName} />
              ) : null}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-input border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-hover"
                onClick={() => setPlanOpen(true)}
              >
                Tarifni o'zgartirish
              </button>
              <button
                type="button"
                className="rounded-input border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-hover"
                onClick={() => setActivateOpen(true)}
              >
                Qo'lda faollashtirish
              </button>
              <button
                type="button"
                className="rounded-input border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-hover"
                onClick={() => void toggleManualBlock()}
                disabled={busy}
              >
                {shop.accessStatus === StoreAccessStatus.MANUALLY_BLOCKED
                  ? "Qo'lda blokni ochish"
                  : "Qo'lda bloklash"}
              </button>
            </div>
            {error ? (
              <p role="alert" className="mt-2 text-sm text-danger-700">
                {error}
              </p>
            ) : null}
          </SectionCard>

          {invoice ? (
            <SectionCard title="So'nggi billing">
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <Row label="Davr" value={formatStoreCreationDate(invoice.billingPeriodStart)} />
                <Row label="Summa" value={formatMoney(invoice.amount)} />
                <Row label="Muddat" value={formatDate(invoice.dueDate)} />
                <Row label="Status" value={invoice.status} />
              </dl>
              {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' ? (
                <button
                  type="button"
                  className="mt-4 rounded-input bg-brand-600 px-3 py-1.5 text-sm font-medium text-white"
                  onClick={() => setPayOpen(true)}
                >
                  To'lovni qayd etish
                </button>
              ) : null}
            </SectionCard>
          ) : null}

          <p className="text-xs text-ink-muted">
            {[shop.ownerName, shop.ownerPhone, shop.address].filter(Boolean).join(' · ')}
          </p>
        </>
      )}

      {planOpen ? (
        <Dialog open title="Tarifni o'zgartirish" onClose={() => setPlanOpen(false)}>
          <p className="mb-3 text-sm text-ink-muted">
            Yangi tarif keyingi billing davridan qo&apos;llaniladi. Eski to&apos;lovlar o&apos;zgarmaydi.
          </p>
          <ul className="divide-y divide-line">
            {(plans.data?.items ?? []).filter((plan) => plan.isActive).map((plan: SubscriptionPlanDto) => (
              <li key={plan.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm font-medium">{plan.name}</p>
                  <p className="text-xs text-ink-muted">{formatMoney(plan.monthlyPrice)}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-input border border-line px-2 py-1 text-xs"
                  onClick={() => void changePlan(plan.id)}
                >
                  {busy ? <Loader2 className="size-3 animate-spin" /> : null}
                  Tanlash
                </button>
              </li>
            ))}
          </ul>
        </Dialog>
      ) : null}

      {activateOpen ? (
        <ManualActivateDialog
          plans={(plans.data?.items ?? []).filter((plan) => plan.isActive)}
          busy={busy}
          onClose={() => setActivateOpen(false)}
          onActivate={async (body) => {
            if (!id) return;
            setBusy(true);
            setError(null);
            try {
              await platformBillingService.activateSubscription(id, body);
              await detail.refetch();
              setActivateOpen(false);
            } catch (caught) {
              setError(caught instanceof ApiClientError ? caught.message : 'Faollashtirib bo‘lmadi');
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}

      {payOpen && invoice ? (
        <RecordPaymentDialog
          invoice={invoice}
          onClose={() => {
            setPayOpen(false);
            void detail.refetch();
          }}
        />
      ) : null}
    </PageContainer>
  );
}

function ManualActivateDialog({
  plans,
  busy,
  onClose,
  onActivate,
}: {
  plans: SubscriptionPlanDto[];
  busy: boolean;
  onClose: () => void;
  onActivate: (body: { planId: string; startDate: string; endDate: string }) => Promise<void>;
}) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return next.toISOString().slice(0, 10);
  });

  return (
    <Dialog open title="Qo'lda faollashtirish" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void onActivate({
            planId,
            startDate: new Date(`${startDate}T00:00:00`).toISOString(),
            endDate: new Date(`${endDate}T23:59:59`).toISOString(),
          });
        }}
      >
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Tarif</span>
          <select
            className="w-full rounded-input border border-line px-3 py-2 text-sm"
            value={planId}
            onChange={(event) => setPlanId(event.target.value)}
            required
          >
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Boshlanish</span>
          <input
            type="date"
            className="w-full rounded-input border border-line px-3 py-2 text-sm"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Tugash</span>
          <input
            type="date"
            className="w-full rounded-input border border-line px-3 py-2 text-sm"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            required
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-input px-3 py-2 text-sm" onClick={onClose}>
            Bekor
          </button>
          <button
            type="submit"
            disabled={busy || !planId}
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Faollashtirish
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">
        {label === 'Kirish' ? <Badge tone="info">{value}</Badge> : value}
      </dd>
    </div>
  );
}
