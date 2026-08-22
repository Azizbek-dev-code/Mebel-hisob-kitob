import { SubscriptionStatus } from '@furniture-erp/shared';
import { Link } from 'react-router-dom';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ROUTES } from '@/routes/paths';
import { cn } from '@/lib/cn';

export function TrialBanner() {
  const { data: user } = useCurrentUser();
  const sub = user?.subscription;
  if (!sub) return null;

  if (sub.status === SubscriptionStatus.TRIAL) {
    const days = sub.daysRemaining ?? 0;
    const warning = days <= 3;
    const copy =
      days <= 0
        ? 'Bugun trial tugaydi'
        : days === 1
          ? 'Sinov muddati: 1 kun qoldi'
          : warning
            ? `Sinov muddati tugashiga ${days} kun qoldi.`
            : `Sinov muddati: ${days} kun qoldi`;

    return (
      <div
        className={cn(
          'flex flex-col gap-2 rounded-card border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between',
          warning
            ? 'border-warning-100 bg-warning-50 text-warning-700'
            : 'border-brand-100 bg-brand-50 text-brand-800',
        )}
      >
        <p className="text-sm font-medium">{copy}</p>
        <Link
          to={ROUTES.billing}
          className="shrink-0 text-sm font-medium underline-offset-2 hover:underline"
        >
          Tarifni tanlash
        </Link>
      </div>
    );
  }

  if (
    sub.status === SubscriptionStatus.EXPIRED ||
    sub.status === SubscriptionStatus.PENDING_PAYMENT
  ) {
    return (
      <div className="flex flex-col gap-2 rounded-card border border-line bg-surface px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink">Sinov muddati tugadi</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {sub.hasPendingPaymentRequest
              ? "Obuna so'rovingiz ko'rib chiqilmoqda. Ma'lumotlaringiz saqlangan."
              : "ERP'dan foydalanishni davom ettirish uchun tarif tanlang."}
          </p>
        </div>
        <Link
          to={ROUTES.billing}
          className="inline-flex shrink-0 items-center justify-center rounded-input bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Tarifni tanlash
        </Link>
      </div>
    );
  }

  return null;
}
