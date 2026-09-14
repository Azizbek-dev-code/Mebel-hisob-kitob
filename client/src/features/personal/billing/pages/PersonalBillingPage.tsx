import {
  PERSONAL_PLAN_KEY,
  canRequestPaidPlan,
  formatMoney,
} from '@furniture-erp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { PaymentRequestModal } from '@/features/billing/components/PaymentRequestModal';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { personalBillingService } from '@/services/personal-billing.service';
import { formatDate } from '@/utils/format';

import {
  usePersonalBilling,
  usePersonalPaymentInstructions,
  useRequestPersonalPayment,
} from '../hooks/use-personal-billing';

export function PersonalBillingPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const billing = usePersonalBilling();
  const requestPayment = useRequestPersonalPayment();
  const [selectedPaid, setSelectedPaid] = useState(false);
  const [uploading, setUploading] = useState(false);
  const instructions = usePersonalPaymentInstructions(selectedPaid);
  const current = billing.data?.currentPlanKey;
  const sub = billing.data?.subscription;
  const paidPlan = billing.data?.plans.find((plan) => plan.key === PERSONAL_PLAN_KEY.PAID);
  const hasPending = Boolean(sub?.hasPendingPaymentRequest || billing.data?.pendingRequest);
  const errorMessage =
    requestPayment.error instanceof Error ? requestPayment.error.message : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.billingTitle')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.billingHint')}</p>
      </div>

      {billing.isPending && !billing.data ? (
        <Skeleton className="h-40 w-full" />
      ) : billing.isError ? (
        <ErrorState
          title={t('personal.billingLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void billing.refetch()}
        />
      ) : (
        <>
          {sub ? (
            <section className="rounded-2xl border border-line bg-surface px-4 py-3.5">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                {t('personal.currentPlan')}
              </p>
              <p className="mt-1 text-sm font-medium text-ink">
                {t(`personal.plans.${sub.planId}`)}
              </p>
              {sub.status === 'TRIAL' && sub.canWrite ? (
                <p className="mt-1 text-sm text-ink-muted">
                  {t('personal.trialDays', { count: sub.daysRemaining ?? 0 })}
                  {sub.trialEndsAt ? ` · ${t('personal.periodEnd', { date: formatDate(sub.trialEndsAt) })}` : ''}
                </p>
              ) : null}
              {sub.status === 'ACTIVE' && sub.currentPeriodEnd ? (
                <p className="mt-1 text-sm text-ink-muted">
                  {t('personal.periodEnd', { date: formatDate(sub.currentPeriodEnd) })}
                </p>
              ) : null}
              {!sub.canWrite ? (
                <p className="mt-2 text-sm text-warning-700">{t('personal.trialEnded')}</p>
              ) : null}
              {hasPending ? (
                <p className="mt-2 text-sm text-warning-700">{t('personal.paymentPending')}</p>
              ) : null}
            </section>
          ) : null}

          {errorMessage ? <p className="text-sm text-danger-700">{errorMessage}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {billing.data?.plans.map((plan) => {
              const selected = current === plan.key;
              const trialLocked = plan.key === PERSONAL_PLAN_KEY.TRIAL;
              const paidAllowed =
                plan.key === PERSONAL_PLAN_KEY.PAID &&
                sub &&
                canRequestPaidPlan({
                  effectiveStatus: sub.status,
                  currentPlanId: current ?? sub.planId ?? '',
                  currentRank: billing.data?.plans.find((item) => item.key === current)?.rank ?? 0,
                  targetPlanId: plan.key,
                  targetRank: plan.rank,
                  targetIsTrial: false,
                });
              const disabled =
                trialLocked || hasPending || requestPayment.isPending || (plan.key === PERSONAL_PLAN_KEY.PAID && !paidAllowed);
              return (
                <article
                  key={plan.key}
                  className={cn(
                    'rounded-panel border bg-surface p-5 shadow-card',
                    selected && sub?.canWrite ? 'border-brand-500' : 'border-line',
                    plan.key === PERSONAL_PLAN_KEY.PAID && !sub?.canWrite ? 'border-brand-500' : null,
                  )}
                >
                  <h2 className="text-sm font-semibold text-ink">
                    {t(`personal.plans.${plan.key}`)}
                  </h2>
                  <p className="mt-2 text-lg font-semibold text-ink">
                    {plan.monthlyPriceSom === 0
                      ? t('personal.free')
                      : `${formatMoney(plan.monthlyPriceSom)} / ${t('personal.month')}`}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {plan.key === PERSONAL_PLAN_KEY.TRIAL
                      ? t('personal.trialLength', { days: plan.trialDays })
                      : t('personal.paidLength', { days: plan.periodDays })}
                  </p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (plan.key === PERSONAL_PLAN_KEY.PAID) setSelectedPaid(true);
                    }}
                    className="mt-4 w-full rounded-input bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                  >
                    {selected && sub?.canWrite
                      ? t('personal.currentPlan')
                      : plan.key === PERSONAL_PLAN_KEY.PAID
                        ? t('personal.choosePlan')
                        : t('personal.currentPlan')}
                  </button>
                </article>
              );
            })}
          </div>
        </>
      )}

      {selectedPaid && paidPlan ? (
        <PaymentRequestModal
          accountName={user?.storeName ?? ''}
          planName={t(`personal.plans.${PERSONAL_PLAN_KEY.PAID}`)}
          price={paidPlan.monthlyPriceSom}
          instructions={instructions.data ?? null}
          submitting={requestPayment.isPending}
          uploading={uploading}
          errorMessage={
            requestPayment.error instanceof ApiClientError
              ? requestPayment.error.message
              : errorMessage
          }
          onClose={() => setSelectedPaid(false)}
          onUploadProof={async (file) => {
            setUploading(true);
            try {
              return await personalBillingService.uploadProof(file);
            } finally {
              setUploading(false);
            }
          }}
          onSubmit={(body) => {
            requestPayment.mutate(body, {
              onSuccess: () => setSelectedPaid(false),
            });
          }}
        />
      ) : null}
    </div>
  );
}
