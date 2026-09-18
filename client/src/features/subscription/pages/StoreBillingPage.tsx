import {
  PLATFORM_BILLING_STATUS_LABELS,
  SUBSCRIPTION_REQUEST_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  canRequestPaidPlan,
  formatMoney,
  isPersonalAuth,
  type AuthPrincipal,
  type RequestStoreSubscriptionBody,
  type StoreSubscriptionDto,
  type SubscriptionPlanDto,
} from '@furniture-erp/shared';
import { Tags } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { PaymentRequestModal } from '@/features/billing/components/PaymentRequestModal';
import { authQueryKeys, useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { storeBillingService } from '@/services/store-billing.service';
import { formatDate } from '@/utils/format';

export function StoreBillingPage() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<SubscriptionPlanDto | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const plans = useQuery({
    queryKey: ['store-billing-plans'],
    queryFn: ({ signal }) => storeBillingService.listPlans(signal),
  });
  const current = useQuery({
    queryKey: ['store-billing-subscription'],
    queryFn: ({ signal }) => storeBillingService.getSubscription(signal),
  });
  const requests = useQuery({
    queryKey: ['store-billing-requests'],
    queryFn: ({ signal }) => storeBillingService.listRequests(signal),
  });
  const payments = useQuery({
    queryKey: ['store-billing-payments'],
    queryFn: ({ signal }) => storeBillingService.listPayments(signal),
  });
  const instructions = useQuery({
    queryKey: ['store-billing-payment-instructions'],
    queryFn: ({ signal }) => storeBillingService.getPaymentInstructions(signal),
    enabled: Boolean(selected),
  });
  const request = useMutation({
    mutationFn: (body: RequestStoreSubscriptionBody) => storeBillingService.requestPayment(body),
    onSuccess: () => {
      setSelected(null);
      setSuccess("Tarifni o‘zgartirish so‘rovi yuborildi. Platforma administratori ko‘rib chiqadi.");
      void queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser });
      void queryClient.invalidateQueries({ queryKey: ['store-billing-subscription'] });
      void queryClient.invalidateQueries({ queryKey: ['store-billing-requests'] });
    },
  });
  const cancel = useMutation({
    mutationFn: (id: string) => storeBillingService.cancelRequest(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser });
      void queryClient.invalidateQueries({ queryKey: ['store-billing-subscription'] });
      void queryClient.invalidateQueries({ queryKey: ['store-billing-requests'] });
    },
  });

  const subscription = current.data?.subscription ?? null;
  const pendingRequest = (requests.data?.items ?? []).find((row) => row.status === 'PENDING');
  const hasPending = Boolean(user?.subscription?.hasPendingPaymentRequest || pendingRequest);

  useEffect(() => {
    if (!subscription || isPersonalAuth(user)) return;
    queryClient.setQueryData<AuthPrincipal | null>(authQueryKeys.currentUser, (prev) => {
      if (!prev || isPersonalAuth(prev) || !prev.subscription) return prev;
      return {
        ...prev,
        subscription: {
          ...prev.subscription,
          status: subscription.status,
          storedStatus: subscription.storedStatus,
          planId: subscription.planId,
          planName: subscription.planName,
          trialEndsAt: subscription.trialEndsAt,
          currentPeriodEnd: subscription.currentPeriodEnd,
          trialWelcomeSeenAt: subscription.trialWelcomeSeenAt,
          daysRemaining: subscription.daysRemaining,
          canWrite: subscription.canWrite,
          featureKeys: subscription.featureKeys,
          featuresRestricted: subscription.featuresRestricted,
        },
      };
    });
  }, [queryClient, subscription, user]);

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">Tarif / Obuna</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Online to&apos;lov yo&apos;q — yangi tarifni tanlang, so&apos;rov asosiy admin panelga tushadi.
        </p>
      </div>

      {subscription ? <CurrentSubscriptionCard subscription={subscription} /> : null}

      {pendingRequest ? (
        <p className="rounded-card border border-brand-100 bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
          So&apos;rov kutilmoqda: {pendingRequest.planName} ·{' '}
          {SUBSCRIPTION_REQUEST_STATUS_LABELS[pendingRequest.status]}
        </p>
      ) : hasPending ? (
        <p className="rounded-card border border-brand-100 bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
          Sizda kutilayotgan obuna so&apos;rovi bor. Platforma administratori tez orada ko&apos;rib chiqadi.
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
            {plans.data?.items.map((plan) => {
              const isCurrent = subscription?.planId === plan.id;
              const selectable = Boolean(
                subscription &&
                  canRequestPaidPlan({
                    effectiveStatus: subscription.status,
                    currentPlanId: subscription.planId,
                    currentRank: subscription.planRank ?? 0,
                    targetPlanId: plan.id,
                    targetRank: plan.rank ?? 0,
                    targetIsTrial: plan.isDefaultTrial,
                  }),
              );
              return (
                <article
                  key={plan.id}
                  className="flex min-w-0 flex-col rounded-card border border-line bg-surface-muted p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-ink">{plan.name}</h3>
                    {isCurrent ? <Badge tone="success">Joriy</Badge> : null}
                  </div>
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
                    disabled={isCurrent || hasPending || !selectable}
                  >
                    {isCurrent ? 'Joriy tarif' : selectable ? 'Tarifni o‘zgartirish' : 'Mavjud emas'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard title="So'rovlar">
        {requests.isPending && !requests.data ? (
          <Skeleton className="h-20 w-full" />
        ) : (requests.data?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-ink-muted">Hali tarif so‘rovi yo‘q.</p>
        ) : (
          <ul className="divide-y divide-line">
            {requests.data?.items.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {row.currentPlanName ?? '—'} → {row.planName}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {formatDate(row.requestedAt)} · {formatMoney(row.requestedPriceSnapshot)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={row.status === 'PENDING' ? 'warning' : row.status === 'APPROVED' ? 'success' : 'neutral'}>
                    {SUBSCRIPTION_REQUEST_STATUS_LABELS[row.status]}
                  </Badge>
                  {row.status === 'PENDING' ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-danger-700 hover:underline disabled:opacity-50"
                      disabled={cancel.isPending}
                      onClick={() => cancel.mutate(row.id)}
                    >
                      Bekor qilish
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="To'lovlar tarixi">
        {payments.isPending && !payments.data ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <p className="mb-3 text-sm text-ink">
              Jami to‘langan: {formatMoney(payments.data?.totalPaid ?? 0)}
              {payments.data?.lastPaymentAt ? ` · oxirgi: ${formatDate(payments.data.lastPaymentAt)}` : ''}
            </p>
            {(payments.data?.items.length ?? 0) === 0 ? (
              <p className="text-sm text-ink-muted">To‘lov yozuvi yo‘q.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs text-ink-muted">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Sana</th>
                      <th className="py-2 pr-3 font-medium">Tarif</th>
                      <th className="py-2 pr-3 font-medium">Summa</th>
                      <th className="py-2 pr-3 font-medium">Holat</th>
                      <th className="py-2 font-medium">Tasdiqlagan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {payments.data?.items.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDate(row.paidAt ?? row.createdAt)}</td>
                        <td className="py-2 pr-3">{row.planName}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{formatMoney(row.amount)}</td>
                        <td className="py-2 pr-3">{PLATFORM_BILLING_STATUS_LABELS[row.status]}</td>
                        <td className="py-2">{row.recordedByName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {selected ? (
        <PaymentRequestModal
          accountName={user?.storeName ?? ''}
          planName={selected.name}
          price={selected.monthlyPrice}
          instructions={instructions.data ?? null}
          submitting={request.isPending}
          uploading={uploading}
          errorMessage={
            request.isError
              ? request.error instanceof ApiClientError
                ? request.error.message
                : "So'rov yuborilmadi"
              : null
          }
          onClose={() => setSelected(null)}
          onUploadProof={async (file) => {
            setUploading(true);
            try {
              return await storeBillingService.uploadProof(file);
            } finally {
              setUploading(false);
            }
          }}
          onSubmit={(body) =>
            request.mutate({
              planId: selected.id,
              ...body,
            })
          }
        />
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
            {isTrial ? `${subscription.planName} (sinov)` : subscription.planName}
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
        {isTrial ? (
          <p className="text-ink-muted">
            {subscription.daysRemaining != null
              ? `Sinovdan ${subscription.daysRemaining} kun qoldi`
              : '7 kunlik sinov'}
          </p>
        ) : null}
        <p className="text-ink-muted">
          Boshlangan: {formatDate(subscription.startedAt)}
          <br />
          Tugash: {formatDate(subscription.expiresAt)}
          {subscription.daysRemaining != null && !isTrial ? (
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
