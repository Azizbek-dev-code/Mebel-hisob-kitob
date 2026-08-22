import {
  SUBSCRIPTION_STATUS_LABELS,
  formatMoney,
  type RequestStoreSubscriptionBody,
  type StoreSubscriptionDto,
  type SubscriptionPlanDto,
} from '@furniture-erp/shared';
import { Loader2, Tags } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { storeBillingService } from '@/services/store-billing.service';
import { formatDate } from '@/utils/format';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export function StoreBillingPage() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<SubscriptionPlanDto | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const plans = useQuery({
    queryKey: ['store-billing-plans'],
    queryFn: ({ signal }) => storeBillingService.listPlans(signal),
  });
  const current = useQuery({
    queryKey: ['store-billing-subscription'],
    queryFn: ({ signal }) => storeBillingService.getSubscription(signal),
  });
  const request = useMutation({
    mutationFn: (body: RequestStoreSubscriptionBody) => storeBillingService.requestPayment(body),
    onSuccess: () => {
      setSelected(null);
      setNote('');
      setSuccess("Arizangiz yuborildi. Platforma administratori siz bilan bog'lanadi.");
      void queryClient.invalidateQueries({ queryKey: ['auth'] });
      void queryClient.invalidateQueries({ queryKey: ['store-billing-subscription'] });
    },
  });

  const subscription = current.data?.subscription ?? null;

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">Tarif / Obuna</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Online to&apos;lov yo&apos;q — tarif tanlang, administrator telefon orqali bog&apos;lanadi.
        </p>
      </div>

      {subscription ? <CurrentSubscriptionCard subscription={subscription} /> : null}

      {user?.subscription?.hasPendingPaymentRequest ? (
        <p className="rounded-card border border-brand-100 bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
          Sizda kutilayotgan obuna so&apos;rovi bor. Platforma administratori tez orada bog&apos;lanadi.
        </p>
      ) : null}

      {success ? (
        <p role="status" className="rounded-card border border-success-100 bg-success-50 px-3 py-2.5 text-sm text-success-700">
          {success}
        </p>
      ) : null}

      <SectionCard title="Tariflar">
        {plans.isPending && !plans.data ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : plans.isError ? (
          <ErrorState
            title="Tariflarni yuklab bo'lmadi"
            message="Qayta urinib ko'ring."
            onRetry={() => void plans.refetch()}
          />
        ) : (plans.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={Tags} title="Tarif yo'q" description="Platforma hali tarif yaratmagan." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {plans.data?.items.map((plan) => (
              <article
                key={plan.id}
                className="flex min-w-0 flex-col rounded-card border border-line bg-surface-muted p-4"
              >
                <h3 className="text-base font-semibold text-ink">{plan.name}</h3>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {formatMoney(plan.monthlyPrice)}
                  <span className="ml-1 text-xs font-normal text-ink-muted">/ oy</span>
                </p>
                <p className="mt-2 text-sm text-ink-muted">{plan.description || 'Tavsif yo‘q'}</p>
                <ul className="mt-3 space-y-1 text-sm text-ink">
                  {(plan.enabledFeatures?.length
                    ? plan.enabledFeatures
                    : plan.featuresRestricted
                      ? []
                      : [{ id: 'all', name: 'Barcha asosiy funksiyalar' }]
                  ).map((item) => (
                    <li key={item.id}>✓ {item.name}</li>
                  ))}
                  {(plan.limits ?? []).map((limit) => (
                    <li key={limit.resourceKey}>
                      ✓ {limit.name}: {limit.unlimited ? 'cheksiz' : limit.limitValue}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-auto pt-4 text-left text-sm font-medium text-brand-700 hover:underline disabled:opacity-50"
                  onClick={() => setSelected(plan)}
                  disabled={Boolean(user?.subscription?.hasPendingPaymentRequest)}
                >
                  Obuna bo&apos;lish
                </button>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      {selected ? (
        <Dialog
          open
          title="Obuna bo'lish"
          description={`${selected.name} · ${formatMoney(selected.monthlyPrice)} / oy`}
          onClose={() => setSelected(null)}
        >
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              request.mutate({ planId: selected.id, note: note.trim() || undefined });
            }}
          >
            <p className="text-sm text-ink">
              {user?.storeName} · {user?.fullName}
              {user?.phone ? ` · ${user.phone}` : ''}
            </p>
            <p className="text-sm text-ink-muted">Muddat: 1 oy</p>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-ink">Izoh (ixtiyoriy)</span>
              <textarea
                className={fieldClass}
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            {request.isError ? (
              <p role="alert" className="text-sm text-danger-700">
                {request.error instanceof ApiClientError
                  ? request.error.message
                  : "So'rov yuborilmadi"}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded-input px-3 py-2 text-sm" onClick={() => setSelected(null)}>
                Bekor
              </button>
              <button
                type="submit"
                disabled={request.isPending}
                className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {request.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Yuborish
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </PageContainer>
  );
}

function CurrentSubscriptionCard({ subscription }: { subscription: StoreSubscriptionDto }) {
  const isTrial = subscription.status === 'TRIAL';
  return (
    <SectionCard title="Joriy tarif">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold text-ink">
            {isTrial ? 'FREE TRIAL' : subscription.planName}
          </p>
          <Badge
            tone={
              subscription.status === 'ACTIVE' || subscription.status === 'TRIAL'
                ? 'success'
                : subscription.status === 'EXPIRED'
                  ? 'danger'
                  : 'warning'
            }
          >
            {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
          </Badge>
        </div>
        {isTrial ? <p className="text-ink-muted">7 kunlik sinov</p> : null}
        <p className="text-ink-muted">
          Boshlangan: {formatDate(subscription.startedAt)}
          <br />
          Tugash: {formatDate(subscription.expiresAt)}
          {subscription.daysRemaining != null ? (
            <>
              <br />
              Qolgan: {subscription.daysRemaining} kun
            </>
          ) : null}
        </p>
        <div>
          <p className="font-medium text-ink">Funksiyalar</p>
          <ul className="mt-1 space-y-0.5 text-ink-muted">
            {(subscription.enabledFeatures ?? []).map((item) => (
              <li key={item.id}>✓ {item.name}</li>
            ))}
            {!subscription.featuresRestricted ? <li>✓ Barcha asosiy funksiyalar</li> : null}
          </ul>
        </div>
        {(subscription.usage ?? []).length > 0 ? (
          <div>
            <p className="font-medium text-ink">Limitlar</p>
            <ul className="mt-1 space-y-0.5 text-ink-muted">
              {subscription.usage.map((row) => (
                <li key={row.resourceKey}>
                  {row.name}: {row.used}
                  {row.unlimited ? ' / cheksiz' : row.limitValue != null ? ` / ${row.limitValue}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
