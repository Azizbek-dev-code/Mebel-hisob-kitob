import { PlatformBillingCycle } from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';

import { AccountDeleteSection } from '@/features/settings/components/AccountDeleteSection';
import {
  ChangePasswordForm,
} from '@/features/auth/components/AccountSecurityForms';

import { usePlatformSettings, useUpdatePlatformSettings } from '../hooks/use-platform-billing';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export function PlatformSettingsPage() {
  const query = usePlatformSettings();
  const save = useUpdatePlatformSettings();
  const settings = query.data?.settings;
  const [platformName, setPlatformName] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('UZS');
  const [gracePeriodDays, setGracePeriodDays] = useState(3);
  const [billingCycle, setBillingCycle] = useState(PlatformBillingCycle.MONTHLY);
  const [paymentRemindersEnabled, setPaymentRemindersEnabled] = useState(false);
  const [reminderDaysBeforeDue, setReminderDaysBeforeDue] = useState(3);
  const [paymentCardNumber, setPaymentCardNumber] = useState('');
  const [paymentAccountNumber, setPaymentAccountNumber] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setPlatformName(settings.platformName);
    setDefaultCurrency(settings.defaultCurrency);
    setGracePeriodDays(settings.gracePeriodDays);
    setBillingCycle(settings.billingCycle);
    setPaymentRemindersEnabled(settings.paymentRemindersEnabled);
    setReminderDaysBeforeDue(settings.reminderDaysBeforeDue);
    setPaymentCardNumber(settings.paymentCardNumber ?? '');
    setPaymentAccountNumber(settings.paymentAccountNumber ?? '');
    setPaymentInstructions(settings.paymentInstructions ?? '');
  }, [settings]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await save.mutateAsync({
        platformName,
        defaultCurrency,
        gracePeriodDays,
        billingCycle,
        paymentRemindersEnabled,
        reminderDaysBeforeDue,
        paymentCardNumber,
        paymentAccountNumber,
        paymentInstructions,
      });
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : 'Saqlab bo‘lmadi');
    }
  }

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">Platform Settings</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Email/SMS yuborilmaydi — reminder sozlamalari kelajakdagi xizmat uchun saqlanadi.
        </p>
      </div>

      {query.isPending && !query.data ? (
        <Skeleton className="h-40 w-full" />
      ) : query.isError ? (
        <ErrorState
          title="Sozlamalar yuklanmadi"
          message="Qayta urinib ko'ring."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <SectionCard title="Konfiguratsiya">
          <form className="max-w-lg space-y-3" onSubmit={(event) => void onSubmit(event)}>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Platforma nomi</span>
              <input className={fieldClass} value={platformName} onChange={(event) => setPlatformName(event.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Valyuta</span>
              <input className={fieldClass} value={defaultCurrency} onChange={(event) => setDefaultCurrency(event.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Grace period (kun)</span>
              <input
                type="number"
                min={0}
                className={fieldClass}
                value={gracePeriodDays}
                onChange={(event) => setGracePeriodDays(Number(event.target.value))}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Billing cycle</span>
              <select
                className={fieldClass}
                value={billingCycle}
                onChange={(event) => setBillingCycle(event.target.value as typeof billingCycle)}
              >
                <option value={PlatformBillingCycle.MONTHLY}>Oylik</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={paymentRemindersEnabled}
                onChange={(event) => setPaymentRemindersEnabled(event.target.checked)}
              />
              To&apos;lov eslatmalari (faqat sozlama, yuborilmaydi)
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Eslatma: muddatdan necha kun oldin</span>
              <input
                type="number"
                min={0}
                className={fieldClass}
                value={reminderDaysBeforeDue}
                onChange={(event) => setReminderDaysBeforeDue(Number(event.target.value))}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">To‘lov kartasi</span>
              <input
                className={fieldClass}
                value={paymentCardNumber}
                onChange={(event) => setPaymentCardNumber(event.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">To‘lov hisob raqami</span>
              <input
                className={fieldClass}
                value={paymentAccountNumber}
                onChange={(event) => setPaymentAccountNumber(event.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">To‘lov izohi (foydalanuvchiga)</span>
              <textarea
                className={fieldClass}
                rows={3}
                value={paymentInstructions}
                onChange={(event) => setPaymentInstructions(event.target.value)}
              />
            </label>
            {error ? (
              <p role="alert" className="text-sm text-danger-700">
                {error}
              </p>
            ) : null}
            {saved ? (
              <p role="status" className="text-sm text-success-700">
                Saqlandi
              </p>
            ) : null}
            <button
              type="submit"
              disabled={save.isPending}
              className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Saqlash
            </button>
          </form>
        </SectionCard>
      )}

      <SectionCard
        title="Xavfsizlik"
        description="Hisobingiz xavfsizligini oshirish uchun parolingizni muntazam yangilang."
      >
        <div className="max-w-lg">
          <h3 className="text-sm font-semibold text-ink">Parol</h3>
          <p className="mt-1 text-xs text-ink-muted">
            Hisobingiz xavfsizligini oshirish uchun parolingizni muntazam yangilang.
          </p>
          <div className="mt-3">
            <ChangePasswordForm variant="platformAdmin" />
          </div>
        </div>
      </SectionCard>

      <AccountDeleteSection />
    </PageContainer>
  );
}
